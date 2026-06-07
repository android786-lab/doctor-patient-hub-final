# Free Doctor Hub dev ports (Windows)
$ports = 5173, 5174, 4000
foreach ($port in $ports) {
  $lines = netstat -ano | Select-String ":$port\s"
  foreach ($line in $lines) {
    if ($line -match '\s+(\d+)\s*$') {
      $pid = $Matches[1]
      if ($pid -ne '0') {
        Write-Host "Killing PID $pid on port $port"
        taskkill /PID $pid /F 2>$null
      }
    }
  }
}
