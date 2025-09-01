using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace ContentCreation.Api.Infrastructure.Conventions;

/// <summary>
/// Convention to add /api prefix to all controller routes
/// </summary>
public class ApiPrefixConvention : IApplicationModelConvention
{
    private readonly string _routePrefix;

    public ApiPrefixConvention(string routePrefix = "api")
    {
        _routePrefix = routePrefix;
    }

    public void Apply(ApplicationModel application)
    {
        foreach (var controller in application.Controllers)
        {
            // Get all selectors for this controller
            var matchedSelectors = controller.Selectors
                .Where(x => x.AttributeRouteModel != null).ToList();
            
            if (matchedSelectors.Any())
            {
                foreach (var selector in matchedSelectors)
                {
                    var template = selector.AttributeRouteModel?.Template;
                    
                    // Skip if already has the prefix or template is null
                    if (!string.IsNullOrEmpty(template) && !template.StartsWith(_routePrefix))
                    {
                        selector.AttributeRouteModel!.Template = $"{_routePrefix}/{template}";
                    }
                }
            }
            else
            {
                // Add prefix to controllers without attribute routing
                controller.Selectors.Add(new SelectorModel
                {
                    AttributeRouteModel = new AttributeRouteModel(new RouteAttribute(_routePrefix))
                });
            }
        }
    }
}