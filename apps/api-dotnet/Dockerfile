# Multi-stage Dockerfile for .NET Core API
# Supports both development (with hot reload) and production builds

# Base stage for runtime dependencies
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Development

# Development stage with SDK for hot reload
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS development
WORKDIR /src

# Install dotnet-ef tool for migrations
RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

# Copy csproj and restore dependencies
COPY ["apps/api-dotnet/ContentCreation.Api.csproj", "apps/api-dotnet/"]
RUN dotnet restore "apps/api-dotnet/ContentCreation.Api.csproj"

# Copy the rest of the source code
COPY apps/api-dotnet/ apps/api-dotnet/

WORKDIR /src/apps/api-dotnet

# Enable hot reload with dotnet watch
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
ENV DOTNET_WATCH_SUPPRESS_MSBUILD_INCREMENTALISM=true

# Start with dotnet watch for hot reload
ENTRYPOINT ["dotnet", "watch", "run", "--no-launch-profile", "--urls", "http://0.0.0.0:5000"]

# Build stage for production
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["apps/api-dotnet/ContentCreation.Api.csproj", "apps/api-dotnet/"]
RUN dotnet restore "apps/api-dotnet/ContentCreation.Api.csproj"

# Copy everything else and build
COPY apps/api-dotnet/ apps/api-dotnet/
WORKDIR /src/apps/api-dotnet
RUN dotnet build "ContentCreation.Api.csproj" -c Release -o /app/build

# Publish stage for production
FROM build AS publish
RUN dotnet publish "ContentCreation.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final production stage
FROM base AS production
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ContentCreation.Api.dll"]

# Default to development stage if not specified
FROM development AS final