# Read-only local queries. No elevation, remote session, policy change or log clearing.
param(
  [Parameter(Mandatory=$true)][ValidateSet('Firewall','System','Application')][string]$Kind,
  [string]$FromIso,
  [string]$ToIso
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Failure($record) {
  $code = 'READ_FAILED'
  if ($record.Exception -is [System.UnauthorizedAccessException] -or
      $record.CategoryInfo.Category -eq 'PermissionDenied' -or
      $record.FullyQualifiedErrorId -match 'AccessDenied|Unauthorized') { $code = 'ACCESS_DENIED' }
  elseif ($record.Exception -is [System.Management.Automation.CommandNotFoundException]) { $code = 'COMMAND_UNAVAILABLE' }
  return @{ status='unverifiable'; code=$code; measuredAt=$null; attemptedAt=[DateTime]::UtcNow.ToString('o') }
}

if ($Kind -eq 'Firewall') {
  try {
    $profiles = @(Get-NetFirewallProfile -PolicyStore ActiveStore -ErrorAction Stop | ForEach-Object {
      $enabled = 'unknown'
      if ([string]$_.Enabled -eq 'True') { $enabled = 'enabled' }
      elseif ([string]$_.Enabled -eq 'False') { $enabled = 'disabled' }
      @{ name=[string]$_.Name; enabled=$enabled }
    })
    if ($profiles.Count -eq 0) { throw 'NO_PROFILES' }
    $result = @{ status='ok'; profiles=$profiles; measuredAt=[DateTime]::UtcNow.ToString('o') }
  } catch { $result = Failure $_ }
} else {
  try {
    $from = [DateTime]::Parse($FromIso, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind)
    $to = [DateTime]::Parse($ToIso, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind)
    # Check that the log is readable/known before treating no matches as zero.
    Get-WinEvent -ListLog $Kind -ErrorAction Stop | Out-Null
    $counts = @{}
    foreach ($entry in @(@{key='warning';level=3}, @{key='error';level=2})) {
      try {
        $count = (Get-WinEvent -FilterHashtable @{LogName=$Kind; Level=$entry.level; StartTime=$from; EndTime=$to} -ErrorAction Stop | Measure-Object).Count
        $counts[$entry.key] = @{status='ok'; value=[long]$count; unit='count'; measuredAt=[DateTime]::UtcNow.ToString('o')}
      } catch {
        if ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') {
          $counts[$entry.key] = @{status='ok'; value=0; unit='count'; measuredAt=[DateTime]::UtcNow.ToString('o')}
        } else { $counts[$entry.key] = Failure $_ }
      }
    }
    $result = @{status='ok'; warning=$counts.warning; error=$counts.error; measuredAt=[DateTime]::UtcNow.ToString('o')}
  } catch { $result = Failure $_ }
}
$result | ConvertTo-Json -Depth 6 -Compress
