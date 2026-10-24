# ==========================================
# 1. VPC (Virtual Private Cloud)
# ==========================================
# This creates the private network for your application.
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "paatam-vpc-${var.environment}"
  }
}

# ==========================================
# 2. Internet Gateway (IGW)
# ==========================================
# This acts as the "front door" connecting the VPC to the public internet.
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "paatam-igw-${var.environment}"
  }
}

# ==========================================
# 3. Public Subnets (For ALB & NAT)
# ==========================================
# We loop over the public_subnets list from your tfvars file.
resource "aws_subnet" "public" {
  count                   = length(var.public_subnets)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnets[count.index]
  map_public_ip_on_launch = true # Instances here automatically get a public IP

  # Dynamically assign AZs (e.g., ap-south-2a, ap-south-2b) based on the loop index
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "paatam-public-subnet-${count.index + 1}-${var.environment}"
  }
}

# Fetch available AZs in the current region
data "aws_availability_zones" "available" {
  state = "available"
}

# ==========================================
# 4. NAT EC2 Instance (Cost-optimized NAT replacing AWS NAT Gateway)
# ==========================================
# Query latest Amazon Linux 2023 ARM64 AMI for Graviton
data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

# The NAT Instance requires a static Public IP, using existing Elastic IP (EIP).
resource "aws_eip" "nat" {
  domain = "vpc"
  
  tags = {
    Name = "paatam-eip-nat-${var.environment}"
  }
}

# Security group for NAT instance allowing outbound internet routing from private subnets
resource "aws_security_group" "nat" {
  name        = "paatam-nat-instance-sg-${var.environment}"
  description = "Security group for NAT EC2 instance allowing outbound internet traffic from private subnets"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow all inbound traffic from VPC CIDR"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "Allow outbound internet traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "paatam-nat-sg-${var.environment}"
  }
}

# Deploy a lightweight t4g.nano (Graviton/ARM64) NAT instance in the first public subnet
resource "aws_instance" "nat" {
  ami                         = data.aws_ssm_parameter.al2023_arm64.value
  instance_type               = "t4g.nano"
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.nat.id]
  source_dest_check           = false

  user_data = <<-EOF
              #!/bin/bash
              echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/99-nat.conf
              sysctl -p /etc/sysctl.d/99-nat.conf
              dnf install -y iptables-services
              DEFAULT_IF=$(ip -4 route ls | grep default | grep -Po '(?<=dev )(\\S+)' | head -n1)
              iptables -t nat -A POSTROUTING -o $DEFAULT_IF -j MASQUERADE
              iptables -F FORWARD
              service iptables save
              systemctl enable --now iptables
              EOF

  tags = {
    Name        = "paatam-nat-instance-${var.environment}"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}

# Associate existing Elastic IP with the NAT instance
resource "aws_eip_association" "nat" {
  instance_id   = aws_instance.nat.id
  allocation_id = aws_eip.nat.id
}


# ==========================================
# 5. Private Subnets (For ECS & Lambda)
# ==========================================
resource "aws_subnet" "private" {
  count             = length(var.private_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "paatam-private-subnet-${count.index + 1}-${var.environment}"
  }
}

# ==========================================
# 6. Isolated Subnets (For RDS & ElastiCache)
# ==========================================
resource "aws_subnet" "isolated" {
  count             = length(var.isolated_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.isolated_subnets[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "paatam-isolated-subnet-${count.index + 1}-${var.environment}"
  }
}

# ==========================================
# 7. Route Tables & Associations
# ==========================================
# Public Route Table: Routes 0.0.0.0/0 (the internet) to the Internet Gateway.
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "paatam-rt-public-${var.environment}"
  }
}

# Associate Public Route Table with Public Subnets
resource "aws_route_table_association" "public" {
  count          = length(var.public_subnets)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Route Table: Routes 0.0.0.0/0 to the NAT EC2 Instance.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block           = "0.0.0.0/0"
    network_interface_id = aws_instance.nat.primary_network_interface_id
  }

  tags = {
    Name = "paatam-rt-private-${var.environment}"
  }
}

# Associate Private Route Table with Private Subnets
resource "aws_route_table_association" "private" {
  count          = length(var.private_subnets)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# Isolated Route Table: No internet routes! Only local VPC traffic allowed.
resource "aws_route_table" "isolated" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "paatam-rt-isolated-${var.environment}"
  }
}

# Associate Isolated Route Table with Isolated Subnets
resource "aws_route_table_association" "isolated" {
  count          = length(var.isolated_subnets)
  subnet_id      = aws_subnet.isolated[count.index].id
  route_table_id = aws_route_table.isolated.id
}

# ==========================================
# 8. VPC Gateway Endpoint for Amazon S3
# ==========================================
# Routes all S3 traffic from Private Subnets (ECS & Lambdas) directly through AWS's
# private network backbone instead of NAT Gateway, eliminating data transfer costs ($0.045/GB).
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = {
    Name        = "paatam-s3-gateway-endpoint-${var.environment}"
    Environment = var.environment
  }
}

