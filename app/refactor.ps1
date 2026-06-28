$dir = "c:\Users\juzzy\Projects\Digi Leagues Gaming 2026\app\src\services"
Get-ChildItem $dir -Filter "*Service.ts" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -notmatch "handleServiceError") {
        $content = "import { handleServiceError } from '../utils/errorHandler';`n" + $content
        
        # We find catch blocks like: catch (err: any) {
        # And inject handleServiceError(err, 'ServiceName');
        $regex = 'catch\s*\(\s*([a-zA-Z0-9_]+)(?:\s*:\s*any)?\s*\)\s*\{'
        $replacement = "catch (`$1: any) {`n    handleServiceError(`$1, '$($_.BaseName)');"
        
        $content = [regex]::Replace($content, $regex, $replacement)
        
        # Remove old console.error if present inside catch
        # A simple replacement for console.error(..., err) - this might be tricky with regex,
        # but let's just let handleServiceError do the logging and leave the old one or remove it if simple.
        $content = [regex]::Replace($content, 'console\.error\([^)]+\);?', '')

        Set-Content -Path $_.FullName -Value $content
        Write-Host "Updated $($_.Name)"
    }
}
