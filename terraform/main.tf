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
# 4. NAT Gateway (For Private Subnets internet access)
# ==========================================
# The NAT Gateway requires a static Public IP, known as an Elastic IP (EIP).
resource "aws_eip" "nat" {
  domain = "vpc"
  
  tags = {
    Name = "paatam-eip-nat-${var.environment}"
  }
}

# We place the NAT Gateway in the FIRST Public Subnet (index 0).
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  # Ensure the Internet Gateway exists before creating the NAT Gateway
  depends_on = [aws_internet_gateway.main]

  tags = {
    Name = "paatam-natgw-${var.environment}"
  }
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

# Private Route Table: Routes 0.0.0.0/0 to the NAT Gateway.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
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
