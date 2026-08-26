param(
  [string]$SourceDirectory = (Join-Path $PSScriptRoot '..\public\muscle-groups')
)

Add-Type -AssemblyName System.Drawing

$muscleGroups = @(
  'back',
  'biceps',
  'calves',
  'chest',
  'core',
  'forearms',
  'glutes',
  'hamstrings',
  'quads',
  'shoulders',
  'triceps'
)

$resolvedSourceDirectory = (Resolve-Path -LiteralPath $SourceDirectory).Path
$outputDirectory = Join-Path $resolvedSourceDirectory 'full'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

foreach ($muscleGroup in $muscleGroups) {
  $sourcePath = Join-Path $resolvedSourceDirectory "$muscleGroup.png"
  $outputPath = Join-Path $outputDirectory "$muscleGroup.png"
  $source = [System.Drawing.Bitmap]::FromFile($sourcePath)

  try {
    $left = $source.Clone()
    $right = $source.Clone()

    try {
      $right.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
      $canvas = New-Object System.Drawing.Bitmap (
        $source.Width * 2
      ), $source.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

      try {
        $graphics = [System.Drawing.Graphics]::FromImage($canvas)

        try {
          $graphics.Clear([System.Drawing.Color]::Transparent)
          $graphics.DrawImage($left, 0, 0)
          $graphics.DrawImage($right, $source.Width, 0)
          $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
          $graphics.Dispose()
        }
      }
      finally {
        $canvas.Dispose()
      }
    }
    finally {
      $left.Dispose()
      $right.Dispose()
    }
  }
  finally {
    $source.Dispose()
  }
}
