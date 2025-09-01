# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ContentCreation.sln ./
COPY src/ContentCreation.Core/*.csproj ./src/ContentCreation.Core/
COPY src/ContentCreation.Infrastructure/*.csproj ./src/ContentCreation.Infrastructure/
COPY src/ContentCreation.Api/*.csproj ./src/ContentCreation.Api/

# Restore dependencies
RUN dotnet restore src/ContentCreation.Api/ContentCreation.Api.csproj

# Copy source code
COPY src/ContentCreation.Core/ ./src/ContentCreation.Core/
COPY src/ContentCreation.Infrastructure/ ./src/ContentCreation.Infrastructure/
COPY src/ContentCreation.Api/ ./src/ContentCreation.Api/

# Build the application
RUN dotnet build src/ContentCreation.Api/ContentCreation.Api.csproj -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish src/ContentCreation.Api/ContentCreation.Api.csproj -c Release -o /app/publish

# Development stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS development
WORKDIR /src

# Install Entity Framework Core tools
RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

# Copy project files
COPY --from=build /src ./

# Set up for hot reload
ENTRYPOINT ["dotnet", "watch", "run", "--project", "src/ContentCreation.Api/ContentCreation.Api.csproj", "--urls", "http://0.0.0.0:5000"]

# Production stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS production
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .

EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000

ENTRYPOINT ["dotnet", "ContentCreation.Api.dll"]