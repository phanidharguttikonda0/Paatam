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
