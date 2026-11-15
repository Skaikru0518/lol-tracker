# ---------- Build Stage ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS builder

# Tailwind standalone CLI for Linux (musl), the same version as tools/tailwindcss.exe locally
ARG TAILWIND_VERSION=4.3.5
ADD --chmod=755 https://github.com/tailwindlabs/tailwindcss/releases/download/v${TAILWIND_VERSION}/tailwindcss-linux-x64-musl /usr/local/bin/tailwindcss

WORKDIR /src

# Copy everything (bin, obj and the generated CSS excluded via .dockerignore). Restoring with the project file alone
# misses the Blazor assets package (blazor.web.js), since the SDK only adds it when it sees the Razor components.
COPY . .

# Restore and publish; the build runs Tailwind
RUN --mount=type=cache,id=nuget,target=/root/.nuget/packages \
    dotnet publish summon.csproj -c Release -o /app/publish -p:TailwindCli=/usr/local/bin/tailwindcss

# ---------- Production Stage ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine

# tzdata: Europe/Budapest is looked up by name (winrate heatmap, seasonal achievements), Alpine has no zone data without it.
# krb5-libs: Npgsql probes GSSAPI on every connection and logs an error when the library is missing.
RUN apk add --no-cache tzdata krb5-libs

# Non-root user, same ids as the Next.js image
RUN addgroup --system --gid 84977 summon && \
    adduser --system --uid 84977 --ingroup summon summon

WORKDIR /app
RUN chown summon:summon /app

# Switch to non-root user before copying
USER summon

COPY --chown=summon:summon --from=builder /app/publish ./

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_HTTP_PORTS=3000

EXPOSE 3000

CMD ["dotnet", "summon.dll"]
