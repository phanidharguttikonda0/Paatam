# Complete Guide to AWS Networking & Infrastructure

This guide explains the foundational mathematics and concepts of AWS networking tailored for the Paatam application architecture.

---

## 1. The Math Behind IPs and CIDR

**Classless Inter-Domain Routing (CIDR)** is how we define a block of IP addresses. An IP address (like `10.0.0.0`) is made of **32 bits** of data, separated into 4 sections (octets). Each section goes from `0` to `255`.

### What does the slash (`/`) mean?
The slash tells the network **how many bits are locked in place**.

- **`/16` (The VPC Level):** 
  If we define our VPC as `10.0.0.0/16`, the first 16 bits (the `10.0.` part) are locked. That leaves 16 bits free to change. 
  $2^{16} = 65,536$ IP addresses. 
  *(Note: A `/8` would leave 24 bits free, yielding 16 million IPs, but AWS enforces a maximum VPC size of `/16`).*

- **`/24` (The Subnet Level):** 
  We carve our `/16` VPC into smaller `/24` subnets.
  `10.0.1.0/24` means the first 24 bits (`10.0.1.`) are locked. That leaves only 8 bits free.
  $2^8 = 256$ IP addresses. *(AWS reserves 5 IPs for router management, leaving 251 usable IPs per subnet).*

Therefore, by allocating `10.0.1.0/24` to AZ-1 and `10.0.2.0/24` to AZ-2, we cleanly assign 256 IPs to each Availability Zone without overlap.

---

## 2. Core AWS Infrastructure Components

### VPC (Virtual Private Cloud)
- **Scope:** The VPC is scoped to the **entire Region** (e.g., `ap-south-2` Hyderabad). It spans across all Availability Zones in that region.
- **Function:** It is your private, isolated slice of the AWS cloud.

### Subnets & Availability Zones (AZs)
- **Scope:** A Subnet is scoped to a **single Availability Zone** (e.g., `ap-south-2a`). A subnet cannot span multiple AZs. 
- **Function:** AZs are separate physical data center buildings miles apart. By putting subnets in multiple AZs, if one building loses power, your app stays online in the other building.

### Internet Gateway (IGW)
- **Function:** The front door. It connects the edge of your VPC to the public internet.

### NAT Gateway & Elastic IPs
- **Function:** The NAT Gateway sits in a Public Subnet and translates Private IPs into a Public IP. 
- **Elastic IP (EIP):** A NAT Gateway *must* have a static, dedicated Public IP (Elastic IP) because the public internet cannot route private IPs like `10.0.X.X`. 

---

## 3. Security: NACL vs Security Groups

AWS provides two layers of firewalls:

1. **Security Groups (SGs):** 
   - **Scope:** Attached at the **Resource level** (e.g., specific to an ECS container or an RDS database).
   - **Type:** *Stateful.* (If you allow a request *in*, the response is automatically allowed *out*).
   - **Usage:** This is what we use 99% of the time. E.g., "Allow traffic from ALB Security Group into ECS Security Group."

2. **Network Access Control Lists (NACLs):**
   - **Scope:** Attached at the **Subnet level**. It acts as a fence around the entire subnet.
   - **Type:** *Stateless.* (You must explicitly write rules for traffic going *in* AND traffic going *out*).
   - **Usage:** Used rarely, usually to explicitly blacklist malicious IPs from entering the subnet entirely.

---

## 4. Services Outside the VPC

Many AWS services do not live inside your VPC. They live on the public AWS network. These include:
- **SES** (Simple Email Service)
- **SNS** (Simple Notification Service)
- **S3** (Storage)
- **SQS** (Queues)
- **DynamoDB** (NoSQL Database)
- **AWS Lambda** (By default)

### How do inside services (ECS) communicate with outside services (SES, SQS)?

Because your ECS containers live in a Private Subnet, they have no direct route to the outside AWS network. You have two choices:

### Option A: VPC Endpoints (AWS PrivateLink)
- **How it works:** You create an "Endpoint" directly inside your VPC that acts as a private tunnel to a specific service (like SQS). Traffic never hits the internet.
- **Cost:** ~$7.30 / month per endpoint per AZ (Interface Endpoints).
- **Pros:** Highly secure, traffic stays strictly on AWS's private backbone.
- **Cons:** Very expensive if you use many services. You need a separate endpoint for ECR API, ECR DKR, Secrets Manager, CloudWatch Logs, and SQS ($36+/month just in endpoints). **Furthermore, it does NOT provide access to the actual internet (like the Claude AI API).**

### Option B: NAT Gateway
- **How it works:** ECS sends the request to the NAT Gateway in the public subnet, which pushes it out to the internet, hits the public endpoint for SES/SQS, and brings the response back.
- **Cost:** ~$32.85 / month per AZ.
- **Why it is the Best Choice:** For ~$32, the NAT Gateway handles communication to **all** external AWS services (ECR, CloudWatch, SQS, SES) **AND** allows your containers/Lambdas to reach external 3rd-party APIs (like Claude/OpenAI). Using endpoints would cost more and still leave you unable to hit the Claude API.

### Why do we need a NAT Gateway per AZ in Production?
In Dev, we place a single NAT Gateway in AZ-A. We tell the subnets in both AZ-A and AZ-B to use it. 
However, if the physical data center for AZ-A goes offline, the subnets in AZ-B suddenly lose their path to the internet, breaking your app! In **Production**, you deploy one NAT Gateway per AZ so that each data center is fully self-sufficient and highly available.

---

## 5. The Routing & Security Layer (ALB & WAF)

### ALB (Application Load Balancer)
- **Heavy Loads:** The ALB is a fully managed service by AWS. Unlike ECS where we specify CPU/RAM limits, we specify **absolutely nothing** for the ALB's compute power. AWS automatically and invisibly scales the ALB behind the scenes to handle massive, global-scale traffic (millions of requests per second).
- **IP Addresses vs DNS Names:** You **cannot** assign a static Elastic IP to an Application Load Balancer. Because AWS constantly scales the ALB, its IP addresses change dynamically. Instead, AWS gives you a permanent **DNS Name** (e.g., `paatam-alb-123.ap-south-2.elb.amazonaws.com`). You use a CNAME or Alias record in your domain registrar to point your website (`api.paatam.com`) to that DNS name.
- **Routing:** It natively uses a Round Robin algorithm to balance traffic across your healthy ECS containers.

### WAF (Web Application Firewall)
The WAF sits in front of the ALB acting as a bouncer, dropping malicious requests before they even touch your Node.js code.
- **In Dev & Prod:** We load the `AWSManagedRulesCommonRuleSet`. This automatically blocks:
  - **SQL Injection (SQLi):** Malicious database queries injected into input fields.
  - **Cross-Site Scripting (XSS):** Malicious javascript injected into payloads.
  - **Bad Inputs & IP Reputation:** Drops exceptionally large requests and traffic from known botnets.
- **WAF Pricing (Production Considerations):**
  - WebACL Base Cost: ~$5.00 / month.
  - AWS Managed Rules: ~$1.00 to $5.00 / month per rule group.
  - Traffic Cost: ~$0.60 per 1 million requests analyzed.
  - *In Prod, if you require extreme security, you can add additional managed rules (like Bot Control or AWS Shield Advanced for DDoS protection), but those increase costs significantly.*

---

## 6. Storage & Messaging Layer (S3, SES, SNS)

### S3 (Simple Storage Service)
- The S3 bucket (`paatam-uploads`) is configured to be strictly private. All public access is blocked at the AWS network level.
- Your Node.js backend must generate "Pre-Signed URLs" to temporarily allow users to download or upload files securely.

### SES (Simple Email Service)
- To send emails from your company domain (e.g., `noreply@paatam.com`), we create an **Email Identity** in AWS.
- AWS will send a physical verification link to that inbox. You must click it to prove ownership. Once verified, your ECS containers can send thousands of OTP emails masquerading as that address.

### SNS (Simple Notification Service)
- **No Sender Number Required:** Unlike Twilio, AWS SNS does NOT require you to buy or register a dedicated "Sender Mobile Number". AWS routes texts through their own global pool of short-codes (like `555-123`).
- **Transactional Routing:** We configure the SMS preferences to "Transactional" (bypassing Do Not Disturb lists, which is crucial for OTPs) and set the Sender ID to `"PAATAM"`, meaning users see "PAATAM" on their phone screens instead of a random phone number.
