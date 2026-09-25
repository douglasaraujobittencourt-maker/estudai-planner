$headers = @{
  "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYXV0cWloc3Vob3RhaXJwbW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTE0MDQsImV4cCI6MjA5OTA4NzQwNH0.bIYQNiuDV9GbM8jrzuY0v3e7zakXkT54ZyVUo1le6hU"
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYXV0cWloc3Vob3RhaXJwbW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTE0MDQsImV4cCI6MjA5OTA4NzQwNH0.bIYQNiuDV9GbM8jrzuY0v3e7zakXkT54ZyVUo1le6hU"
}

# Fetch subjects
$subjects = Invoke-RestMethod -Uri "https://mgautqihsuhotairpmmt.supabase.co/rest/v1/subjects" -Headers $headers -Method Get

Write-Host "Found $($subjects.Count) subjects:"

# Group colors (Hex codes)
$blue = "#38BDF8"    # Conhecimentos Básicos
$lilac = "#A78BFA"   # Conhecimentos Específicos 1
$green = "#34D399"   # Conhecimentos Específicos 2

foreach ($s in $subjects) {
  $name = $s.name
  $id = $s.id
  $color = ""

  # Classify by name matching
  if ($name -match "Português|Língua Portuguesa|Maria da Penha|11\.340|RIDE|PDPM|Mulheres|840/2011|7\.484|SEDES|LODF|Orgânica|Socorros|Básicos") {
    $color = $blue
    $group = "Conhecimentos Básicos"
  }
  elseif ($name -match "PNAS|Prato Cheio|7\.009|Benefícios|Eventuais|SISAN|Restaurante|SUAS|NOB|6\.938|Gás|7\.008|DF Social|Socioassistenciais") {
    $color = $lilac
    $group = "Conhecimentos Específicos 1"
  }
  elseif ($name -match "Atendimento|Rotinas|Arquivologia|Administrativo|Recursos|Materiais|Patrimônio|Compras|14\.133|Constitucional|Específicos 2") {
    $color = $green
    $group = "Conhecimentos Específicos 2"
  }
  else {
    # Default fallback if not matched
    Write-Host "Unmatched: $name - keeping current color"
    continue
  }

  Write-Host "Updating '$name' -> $group ($color)"

  # Update color in database
  $body = @{ color = $color } | ConvertTo-Json
  $updateUri = "https://mgautqihsuhotairpmmt.supabase.co/rest/v1/subjects?id=eq.$id"
  $res = Invoke-RestMethod -Uri $updateUri -Headers $headers -Method Patch -Body $body -ContentType "application/json"
}

Write-Host "Finished updates!"
