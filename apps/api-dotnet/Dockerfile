# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project file
COPY ContentCreation.Api.csproj ./

# Restore dependencies
RUN dotnet restore ContentCreation.Api.csproj

# Copy source code
COPY . ./

# Build the application
RUN dotnet build ContentCreation.Api.csproj -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish ContentCreation.Api.csproj -c Release -o /app/publish

# Development stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS development
WORKDIR /src

# Install Entity Framework Core tools
RUN dotnet tool install --global dotnet-ef
ENV PATH="$PATH:/root/.dotnet/tools"

# Copy project files
COPY --from=build /src ./

# Set up for hot reload
ENTRYPOINT ["dotnet", "watch", "run", "--project", "ContentCreation.Api.csproj", "--urls", "http://0.0.0.0:5000"]

# Production stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS production
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .

EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000

ENTRYPOINT ["dotnet", "ContentCreation.Api.dll"]