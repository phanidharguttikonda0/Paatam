# Terraform Architecture Guide

This document explains how the Terraform files in this directory connect, act at runtime, and precisely what each file is doing.

## 1. How the Terraform Files Connect

Our setup uses Terraform "Workspaces" or environment files (like `dev.tfvars`) to behave exactly like `.env` files. Here is the data flow:

1. **`variables.tf`**: This file just declares the *names* of the variables and their types. It says, *"Hey, I need a list of strings called `public_subnets`."*
2. **`environments/dev.tfvars`**: This file provides the actual values. It says, *"Here is that list: `["10.0.1.0/24", "10.0.2.0/24"]`."*
3. **Command Line Injection**: When you run `terraform plan -var-file="environments/dev.tfvars"`, Terraform injects the values from the tfvars file directly into `variables.tf`.
4. **`main.tf`**: This file reads the variables using the syntax `var.variable_name` to build the actual infrastructure.

---

## 2. File Explanations

### `providers.tf`
This file is the engine. It tells Terraform: "We are talking to AWS, please download the AWS API plugins." 
It also contains the `default_tags` block, which ensures every single resource we create gets automatically tagged with `Project = Paatam` and the current Environment, which is crucial for AWS cost-tracking.

### `variables.tf`
This is the blueprint definition. It holds absolutely no actual data. It simply defines what inputs our Terraform code expects to receive when run.

### `main.tf` (Line-by-Line Meaning)

```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
}
```
- **`resource "aws_vpc" "main"`**: Creates a resource of type `aws_vpc` named `"main"` internally for Terraform to reference.
- **`cidr_block = var.vpc_cidr`**: Reads the IP range (e.g., `10.0.0.0/16`) from your injected variables.
- **`enable_dns_support = true`**: Allows the AWS internal DNS server to run inside your VPC. 
- **`enable_dns_hostnames = true`**: Gives your RDS database human-readable internal domain names instead of just raw IP addresses.

```hcl
resource "aws_subnet" "public" {
  count      = length(var.public_subnets)
  vpc_id     = aws_vpc.main.id
  cidr_block = var.public_subnets[count.index]
}
```
- **`count = length(var.public_subnets)`**: Because your list in `dev.tfvars` has 2 items, `count` becomes `2`. Terraform will loop this block twice.
- **`vpc_id = aws_vpc.main.id`**: Places the subnet inside the VPC. Terraform inherently knows it must wait for the VPC to finish creating before it can create the subnet.
- **`cidr_block = var.public_subnets[count.index]`**: On loop 1 (`count.index = 0`), it grabs `"10.0.1.0/24"`. On loop 2 (`count.index = 1`), it grabs `"10.0.2.0/24"`.

```hcl
resource "aws_route_table" "public" {
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}
```
- **`route`**: This is the traffic cop. `0.0.0.0/0` means "literally anywhere on the internet". It tells traffic destined for the internet to go through the Internet Gateway.

```hcl
resource "aws_route_table" "private" {
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
}
```
- **`route`**: This tells traffic from the Private Subnet to go through the NAT Gateway to reach the internet.

*Notice that the `aws_route_table.isolated` block has no route. This means traffic is utterly trapped inside the VPC, which is perfectly secure for our RDS database!*

### `rds.tf` (The Data Module)
This file sets up the entire data layer.
- **`aws_db_subnet_group`**: Tells RDS to only deploy into the isolated subnets.
- **Security Groups**: Sets up a strict chain of trust. ECS is the only thing allowed to talk to RDS Proxy. RDS Proxy is the only thing allowed to talk to the Database.
- **`aws_db_instance`**: Creates the Postgres database dynamically sizing itself based on the `var.db_instance_class` from the tfvars file.
- **`aws_iam_role` & `aws_db_proxy`**: Sets up the RDS Proxy connection pooler, which uses the IAM role to read the secret from AWS Secrets Manager.

### `secrets.tf`
Creates the `aws_secretsmanager_secret` container, and injects a dynamically generated `random_password` (created in `rds.tf`) along with the database host, port, and username into a secure JSON payload.
### `ecr.tf`
Creates the Elastic Container Registry (ECR). This is exactly like DockerHub, but private to your AWS account. When you push your Node.js Docker image, it goes here.

### `alb.tf` (The Routing Layer)
- **Security Group**: Opens ports 80 (HTTP) and 443 (HTTPS) to the public internet.
- **`aws_lb` (Application Load Balancer)**: Placed in the Public Subnets, it acts as the traffic cop.
- **Target Group**: This actively tracks the IP addresses of your ECS containers. Because containers die and restart with new IPs, the Target Group keeps the list updated constantly.
- **Listener**: Listens on Port 80 and forwards all traffic to the Target Group.

### `ecs.tf` (The Compute Module)
This is where your code actually runs!
- **`aws_cloudwatch_log_group`**: A destination for all `console.log` output.
- **`aws_ecs_task_definition`**: The "Blueprint" for your container. It pulls the image from `ecr.tf`, defines the 1 vCPU and 1 GB RAM, and injects the `DATABASE_HOST` environment variable automatically pointing to the RDS Proxy.
- **`aws_ecs_service`**: This is the orchestrator. It ensures that exactly `var.ecs_desired_count` (e.g., 2) containers are always running, places them in the Private Subnets, and automatically registers them with the ALB Target Group.

### `waf.tf` (The Security Shield)
- **`aws_wafv2_web_acl`**: The Web Application Firewall. It is loaded with the `AWSManagedRulesCommonRuleSet`, meaning AWS automatically blocks known bad IP addresses, SQL injection attempts, and Cross-Site Scripting (XSS) attacks.
- **`aws_wafv2_web_acl_association`**: Wraps the WAF around the Load Balancer like a shield.
### `s3.tf` (The Storage Layer)
- **`aws_s3_bucket`**: Creates a completely private bucket for user uploads.
- **`aws_iam_role` (ECS Task Role)**: Unlike the Execution Role (which pulls images), the Task Role is given directly to your running Node.js code. We attach a policy to this role granting your code the ability to Read/Write to the S3 bucket.

### `messaging.tf` (SES and SNS)
- **`aws_ses_email_identity`**: Registers your company email address with AWS. AWS will send a verification link to this email to prove ownership before allowing you to send OTPs.
- **`aws_sns_sms_preferences`**: Configures AWS SNS to act as a "Transactional" SMS sender, using the sender ID "PAATAM" so users see your company name on their texts.
- **Permissions**: We attach SES and SNS permissions to the ECS Task Role so your Node app can trigger emails and texts.

---
## 3. The Architecture Sequence: Why Build Bottom-Up?

You might wonder why we are building the infrastructure in this specific order:
**RDS -> Secrets Manager -> RDS Proxy -> ECS -> ALB -> WAF**

The reason is **Dependency Mapping (The Directed Acyclic Graph - DAG)**.
Terraform builds infrastructure exactly like a compiler builds code. A resource cannot be created until everything it depends on already exists.

1. **RDS Database**: The absolute core. Nothing else matters if data can't be stored.
2. **Secrets Manager**: Can only be created *after* the RDS instance exists, because it needs to store the RDS `endpoint_address` (which isn't generated until AWS physically boots the database).
3. **RDS Proxy**: Can only be created *after* Secrets Manager exists, because the proxy uses IAM to read the credentials to log into the database.
4. **ECS Cluster & Fargate Tasks (Next)**: Your Node.js containers can only boot up *after* the RDS Proxy endpoint is available, because the ECS Task Definition needs to inject the `DATABASE_URL` (pointing to the proxy) as an environment variable into your code!
5. **Application Load Balancer (ALB)**: The ALB can only route traffic to an ECS Cluster *after* the ECS service is created and registers its containers with the ALB's Target Group.
6. **Web Application Firewall (WAF)**: The WAF is the final shield, wrapping around the ALB *after* the ALB exists to block SQL injection and rate-limit bad actors.

This bottom-up approach guarantees that Terraform will never crash due to a missing dependency!

---

## 4. Summary of the Foundation

**The Complete Foundation is Finished!**
We have now successfully designed and written the explicit Terraform Infrastructure as Code for your entire backend architecture:

1. **Network Layer**: VPC, Subnets, IGW, NAT Gateway, Route Tables (`main.tf`).
2. **Data Layer**: RDS Database, Secrets Manager, RDS Proxy (`rds.tf`, `secrets.tf`).
3. **Compute Layer**: ECR, ECS Fargate, CloudWatch Logs (`ecs.tf`, `ecr.tf`).
4. **Routing & Security**: ALB, WAF (`alb.tf`, `waf.tf`).
5. **Storage & Messaging**: S3, SES, SNS (`s3.tf`, `messaging.tf`).

Everything is completely variable-driven via `dev.tfvars` and `prod.tfvars` to ensure maximum cost savings in Dev and high-availability scaling in Prod.

---

## 5. Deployment Guide: AWS CLI & Authentication

Before you can deploy this Terraform code, you must authenticate your machine with AWS.

### Step 1: Install AWS CLI and Terraform
Since you are using openSUSE, open your terminal and run this command (it will ask for your root password):
```bash
sudo zypper refresh && sudo zypper install -y aws-cli terraform
```

### Step 2: Generate AWS Access Keys
AWS uses "Access Keys" to authenticate your terminal instead of a traditional password. Here is exactly how to get them:

1. Log into the [AWS Management Console](https://aws.amazon.com/console/).
2. In the top-right corner, click on your **Account Name** and select **Security Credentials** from the dropdown.
3. Scroll down to the **Access keys** section.
4. Click the **Create access key** button.
5. Select **Command Line Interface (CLI)** as the use case, check the confirmation box, and click **Next**.
6. (Optional) Give it a description tag like "My local dev machine" and click **Create access key**.
7. **STOP!** Do not close this page yet. You will see an **Access key ID** and a **Secret access key**. This is the *only* time AWS will ever show you the Secret Key. 

### Step 3: Configure your Terminal
Now that you have your keys, go back to your terminal in the IDE and run:
```bash
aws configure
```
It will prompt you for 4 things. Copy and paste them exactly:
- **AWS Access Key ID**: *(Paste the Access Key ID from AWS)*
- **AWS Secret Access Key**: *(Paste the Secret Access Key from AWS)*
- **Default region name**: `ap-south-2`
- **Default output format**: `json`

### Step 4: Run Terraform
Once `aws configure` is complete, your terminal is securely logged into AWS. You can now deploy the infrastructure:
1. `cd terraform/`
2. `terraform init` (Downloads the AWS plugins)
3. `terraform plan -var-file="environments/dev.tfvars"` (Shows you what AWS will create)
4. `terraform apply -var-file="environments/dev.tfvars" -auto-approve` (Actually builds it!)
