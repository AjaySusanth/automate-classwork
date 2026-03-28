variable "project_name" {
    description = "Base name for all resources"
    type = string
    default = "classwork"
}

variable "location" {
    description = "Azure region to deploy to"
    type = string
    default = "centralindia"
}

variable "environment" {
    description = "Deployment environment"
    type = string
    default = "prod"

    validation {
        condition = contains(["dev","staging","prod"], var.environment)

        error_message = "Environment must be dev stage or prod"
    }
}

variable "db_admin_user" {
    description = "PostgreSQL admin username"
    type = string
    default = "classworkadmin"
}

variable "db_admin_password" {
    description = "PostgreSQL admin password"
    type        = string
    sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}
variable "telegram_bot_token" {
  description = "Telegram Bot API token"
  type        = string
  sensitive   = true
}
variable "internal_api_key" {
  description = "API key for internal service-to-service calls"
  type        = string
  sensitive   = true
}
variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
}
variable "supabase_service_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
}