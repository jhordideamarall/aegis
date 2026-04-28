Organization: socialbrand1980's Org
Prjoject_name: aegis
Database_password: ZppJON1ueIKRAQp8

NEXT_PUBLIC_SUPABASE_URL=https://yysvzccrxxfmkoijeykv.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3Z6Y2NyeHhmbWtvaWpleWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjE5MTUsImV4cCI6MjA5MjkzNzkxNX0.uhDyqgJQUAe_ycS8YSCOiBw-Qub8e1z9hMMsIdlUCtQ

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3Z6Y2NyeHhmbWtvaWpleWt2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM2MTkxNSwiZXhwIjoyMDkyOTM3OTE1fQ.7wOXbUwhZJ8hSuFVF8ruEOjV1A2nHw_-mPq9hAqoF9M

<!-- yang lama -->
NEXT_PUBLIC_SUPABASE_URL=https://bzcxdqmqofdyzpzfxlyo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6Y3hkcW1xb2ZkeXpwemZ4bHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDY5MDYsImV4cCI6MjA4ODc4MjkwNn0.rrkMJU0fqG0TCAkKb0ZKcF5jToe5d3b30fXR6gsVKmQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6Y3hkcW1xb2ZkeXpwemZ4bHlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIwNjkwNiwiZXhwIjoyMDg4NzgyOTA2fQ.eHJv8ayLX4ZOZIakd8sIqM0U3xEtkOeJRaCNgApJ5hU


1. Configure MCP
Set up your MCP client.
Details:
Ensure you are running Gemini CLI version 0.20.2 or higher.
Add the Supabase MCP server to Gemini CLI:
Alternatively, add this configuration to .gemini/settings.json:
After installation, start the Gemini CLI and run the following command to authenticate the server:
Need help?View Gemini CLI docs
Code:
File: Code
```
gemini mcp add -t http supabase https://mcp.supabase.com/mcp?project_ref=yysvzccrxxfmkoijeykv
```

File: Code
```
1{
2  "mcpServers": {
3    "supabase": {
4      "httpUrl": "https://mcp.supabase.com/mcp?project_ref=yysvzccrxxfmkoijeykv"
5    }
6  }
7}
```

File: Code
```
/mcp auth supabase
```