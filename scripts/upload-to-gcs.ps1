[CmdletBinding()]
param(
    [string]$Bucket = "gs://easy-flashes",
    [switch]$DryRun,
    [switch]$DeleteRemote
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    throw "gcloud CLI não encontrado. Instale o Google Cloud CLI e autentique-se antes de continuar."
}

if ($Bucket -notmatch '^gs://[^/]+/?$') {
    throw "Bucket inválido: '$Bucket'. Use o formato gs://nome-do-bucket."
}

Write-Host "Verificando acesso a $Bucket..."
& gcloud storage buckets describe $Bucket --format="value(name)" | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível acessar $Bucket. Verifique o nome, projeto ativo e permissões."
}

$arguments = @(
    "storage", "rsync",
    $projectRoot,
    $Bucket,
    "--recursive",
    "--exclude=^\.git(/|\\)"
)

if ($DryRun) {
    $arguments += "--dry-run"
}

if ($DeleteRemote) {
    $arguments += "--delete-unmatched-destination-objects"
}

Write-Host "Sincronizando $projectRoot com $Bucket..."
& gcloud @arguments
if ($LASTEXITCODE -ne 0) {
    throw "O upload falhou com código de saída $LASTEXITCODE."
}

if ($DryRun) {
    Write-Host "Simulação concluída; nenhum arquivo foi enviado."
} else {
    Write-Host "Upload concluído: $Bucket"
}