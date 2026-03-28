data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "main" {
    name = "rg-${var.project_name}-${var.environment}"
    location = var.location

    tags = {
        Environment = var.environment
        Project = var.project_name
        ManagedBy = "terraform"
    }
  
}

resource "azurerm_container_registry" "acr" {
    name = "${var.project_name}acr"
    resource_group_name = azurerm_resource_group.main.name
    location = azurerm_resource_group.main.location
    sku = "Basic"
    admin_enabled = true

    tags = azurerm_resource_group.main.tags
}

resource "azurerm_postgresql_flexible_server" "db" {
    name = "${var.project_name}-db-${var.environment}"
    resource_group_name = azurerm_resource_group.main.name
    location = azurerm_resource_group.main.location
    version = "16"
    administrator_login = var.db_admin_user
    administrator_password = var.db_admin_password
    sku_name = "B_Standard_B1ms"
    storage_mb = 32768
    zone = "1"
    tags = azurerm_resource_group.main.tags
}

# Create the actual database inside the server
resource "azurerm_postgresql_flexible_server_database" "classwork" {
    name = var.project_name
    server_id = azurerm_postgresql_flexible_server.db.id
    charset = "UTF8"
    collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_database" "n8n" {
  name      = "n8n_data"
  server_id = azurerm_postgresql_flexible_server.db.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
    name = "AllowAzureServices"
    server_id = azurerm_postgresql_flexible_server.db.id

    start_ip_address = "0.0.0.0"
    end_ip_address = "0.0.0.0"
  
}

resource "azurerm_log_analytics_workspace" "logs" {
  name                = "log-${var.project_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  # 30 days of log retention. Azure free tier gives you 5GB/month free.
  tags = azurerm_resource_group.main.tags
}

resource "azurerm_container_app_environment" "env" {
    name = "cae-${var.project_name}-${var.environment}"
    resource_group_name = azurerm_resource_group.main.name
    location = azurerm_resource_group.main.location
    log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id
    tags = azurerm_resource_group.main.tags
}

resource "azurerm_key_vault" "kv" {
    name = "kv-${var.project_name}-${var.environment}"
    resource_group_name = azurerm_resource_group.main.name
    location = azurerm_resource_group.main.location
    tenant_id = data.azurerm_client_config.current.tenant_id
    sku_name = "standard"
    purge_protection_enabled = false
    access_policy {
        tenant_id = data.azurerm_client_config.current.tenant_id
        object_id = data.azurerm_client_config.current.object_id

        secret_permissions = [
            "Get","Set","List","Purge","Delete"
        ]
    }

    tags = azurerm_resource_group.main.tags
  
}

# Store all application secrets in Key Vault
resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = var.jwt_secret
  key_vault_id = azurerm_key_vault.kv.id
}
resource "azurerm_key_vault_secret" "telegram_bot_token" {
  name         = "telegram-bot-token"
  value        = var.telegram_bot_token
  key_vault_id = azurerm_key_vault.kv.id
}
resource "azurerm_key_vault_secret" "internal_api_key" {
  name         = "internal-api-key"
  value        = var.internal_api_key
  key_vault_id = azurerm_key_vault.kv.id
}
resource "azurerm_key_vault_secret" "supabase_url" {
  name         = "supabase-url"
  value        = var.supabase_url
  key_vault_id = azurerm_key_vault.kv.id
}
resource "azurerm_key_vault_secret" "supabase_service_key" {
  name         = "supabase-service-key"
  value        = var.supabase_service_key
  key_vault_id = azurerm_key_vault.kv.id
}
resource "azurerm_key_vault_secret" "db_connection_string" {
  name         = "database-url"
  value        = "postgresql://${var.db_admin_user}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.db.fqdn}:5432/${var.project_name}?sslmode=require"
  key_vault_id = azurerm_key_vault.kv.id
  # Notice: sslmode=require — Azure enforces SSL for managed Postgres.
  # Without this, your app would fail to connect.
}

resource "azurerm_container_app" "staging" {
  name = "${var.project_name}-api-staging"
  resource_group_name = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.env.id
  revision_mode = "Single"
    # "Single" = only one revision active at a time.
    # Staging doesn't need blue/green — we just overwrite it.

  template {
    min_replicas = 0
    max_replicas = 1
    container {
        name = "classwork-api"
        image = "${azurerm_container_registry.acr.login_server}/${var.project_name}-app:latest"
        cpu = 0.25
        memory = "0.5Gi"
        env {
            name  = "DATABASE_URL"
            value = "postgresql://${var.db_admin_user}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.db.fqdn}:5432/${var.project_name}?sslmode=require"
        }
        env {
            name  = "JWT_SECRET"
            value = var.jwt_secret
        }
        env {
            name  = "TELEGRAM_BOT_TOKEN"
            value = var.telegram_bot_token
        }
        env {
            name  = "INTERNAL_API_KEY"
            value = var.internal_api_key
        }
        env {
            name  = "STORAGE_PROVIDER"
            value = "supabase"
        }
        env {
            name  = "SUPABASE_URL"
            value = var.supabase_url
        }
        env {
            name  = "SUPABASE_SERVICE_KEY"
            value = var.supabase_service_key
        }
        env {
            name  = "SUPABASE_BUCKET"
            value = "submissions"
        }
        env {
            name  = "NODE_ENV"
            value = "staging"
        }
        env {
            name = "N8N_WEBHOOK_URL"
            value = "https://${azurerm_container_app.n8n.ingress[0].fqdn}/webhook/assignment-created"
        }
    }
  }
  ingress {
    external_enabled = true
    traffic_weight {
        percentage = 100
        latest_revision = true

    }
    target_port = 80
    transport = "http"
  }
  registry {
    server = azurerm_container_registry.acr.login_server
    username = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }

  tags = azurerm_resource_group.main.tags
}

resource "azurerm_container_app" "production" {
    name = "${var.project_name}-api-prod"
    resource_group_name = azurerm_resource_group.main.name
    container_app_environment_id = azurerm_container_app_environment.env.id

    revision_mode = "Multiple"

    template {
        min_replicas = 0
        max_replicas = 3

        container {
            name = "classwork-api"
            image = "${azurerm_container_registry.acr.login_server}/${var.project_name}-app:latest"
            cpu = 0.5
            memory = "1Gi"
            env {
                name  = "DATABASE_URL"
                value = "postgresql://${var.db_admin_user}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.db.fqdn}:5432/${var.project_name}?sslmode=require"
            }
            env {
                name  = "JWT_SECRET"
                value = var.jwt_secret
            }
            env {
                name  = "TELEGRAM_BOT_TOKEN"
                value = var.telegram_bot_token
            }
            env {
                name  = "INTERNAL_API_KEY"
                value = var.internal_api_key
            }
            env {
                name  = "STORAGE_PROVIDER"
                value = "supabase"
            }
            env {
                name  = "SUPABASE_URL"
                value = var.supabase_url
            }
            env {
                name  = "SUPABASE_SERVICE_KEY"
                value = var.supabase_service_key
            }
            env {
                name  = "SUPABASE_BUCKET"
                value = "submissions"
            }
            env {
                name  = "NODE_ENV"
                value = "production"
            }
            env {
                name = "N8N_WEBHOOK_URL"
                value = "https://${azurerm_container_app.n8n.ingress[0].fqdn}/webhook/assignment-created"
            }
        }
    }
    ingress {
        external_enabled = true
        traffic_weight {
            percentage = 100
            latest_revision = true
        }
        target_port = 80
        transport = "http"
    }

    registry {
        server = azurerm_container_registry.acr.login_server
        username = azurerm_container_registry.acr.admin_username
        password_secret_name = "acr-password"
    }

    secret {
        name = "acr-password"
        value = azurerm_container_registry.acr.admin_password
    }
    tags = azurerm_resource_group.main.tags
}

resource "azurerm_container_app" "n8n" {
    name = "${var.project_name}-n8n"
    resource_group_name = azurerm_resource_group.main.name
    container_app_environment_id = azurerm_container_app_environment.env.id
    revision_mode  = "Single"
    
    template {
        min_replicas = 0
        max_replicas = 1

        container {
            name = "n8n"
            image = "n8nio/n8n:latest"
            cpu = 0.5
            memory = "1Gi"

            env {
                name  = "N8N_HOST"
                value = "0.0.0.0"
            }
            env {
                name  = "N8N_PORT"
                value = "5678"
            }
            env {
                name  = "N8N_PROTOCOL"
                value = "https"
            }
            env {
                name  = "WEBHOOK_URL"
                # This will be the auto-generated URL from Container Apps
                # We'll update this after first deployment
                value =  "https://${var.project_name}-n8n.${azurerm_container_app_environment.env.default_domain}"
            }
            env {
                name  = "N8N_ENCRYPTION_KEY"
                value = var.internal_api_key
                # Reusing the internal API key as n8n's encryption key for simplicity.
            }
            env {
                name  = "DB_TYPE"
                value = "postgresdb"
            }
            env {
                name  = "DB_POSTGRESDB_DATABASE"
                value = "n8n_data"
            }
            env {
                name  = "DB_POSTGRESDB_HOST"
                value = azurerm_postgresql_flexible_server.db.fqdn
            }
            env {
                name  = "DB_POSTGRESDB_PORT"
                value = "5432"
            }
            env {
                name  = "DB_POSTGRESDB_USER"
                value = var.db_admin_user
            }
            env {
                name  = "DB_POSTGRESDB_PASSWORD"
                value = var.db_admin_password
            }
            env {
                name  = "DB_POSTGRESDB_SSL_ENABLED"
                value = "true"
            }
        }
    }

    ingress {
        external_enabled = true
        traffic_weight {
            percentage = 100
            latest_revision = true
        }
        target_port = 5678
        transport = "http"
    }
  
    tags = azurerm_resource_group.main.tags
}

