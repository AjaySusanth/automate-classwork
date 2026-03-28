output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "acr_login_server" {
  description = "ACR login server url"
  value = azurerm_container_registry.acr.login_server
}

output "acr_admin_username" {
    description = "ACR admin username"
    value = azurerm_container_registry.acr.admin_username
}

output "acr_admin_password" {
    description = "ACR admin password"
    value = azurerm_container_registry.acr.admin_password
    sensitive = true
}

output "database_fqdn" {
  description = "PostgreSQL server hostname"
  value       = azurerm_postgresql_flexible_server.db.fqdn
}
output "staging_url" {
  description = "Staging app URL"
  value       = "https://${azurerm_container_app.staging.ingress[0].fqdn}"
}
output "production_url" {
  description = "Production app URL"
  value       = "https://${azurerm_container_app.production.ingress[0].fqdn}"
}
output "n8n_url" {
  description = "n8n workflow automation URL"
  value       = "https://${azurerm_container_app.n8n.ingress[0].fqdn}"
}
output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.kv.name
}



