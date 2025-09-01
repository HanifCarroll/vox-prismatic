# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ContentCreation.sln ./
COPY src/ContentCreation.Core/*.csproj ./src/ContentCreation.Core/
COPY src/ContentCreation.Infrastructure/*.csproj ./src/ContentCreation.Infrastructure/
COPY src/ContentCreation.Worker/*.csproj ./src/ContentCreation.Worker/

# Restore dependencies
RUN dotnet restore src/ContentCreation.Worker/ContentCreation.Worker.csproj

# Copy source code
COPY src/ContentCreation.Core/ ./src/ContentCreation.Core/
COPY src/ContentCreation.Infrastructure/ ./src/ContentCreation.Infrastructure/
COPY src/ContentCreation.Worker/ ./src/ContentCreation.Worker/

# Build the application
RUN dotnet build src/ContentCreation.Worker/ContentCreation.Worker.csproj -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish src/ContentCreation.Worker/ContentCreation.Worker.csproj -c Release -o /app/publish

# Development stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS development
WORKDIR /src

# Install Entity Framework Core tools
RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

# Copy project files
COPY --from=build /src ./

# Set up for hot reload
ENTRYPOINT ["dotnet", "watch", "run", "--project", "src/ContentCreation.Worker/ContentCreation.Worker.csproj"]

# Production stage
FROM mcr.microsoft.com/dotnet/runtime:9.0 AS production
WORKDIR /app

# Install procps for health checks (provides pgrep)
RUN apt-get update && apt-get install -y procps && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "ContentCreation.Worker.dll"]