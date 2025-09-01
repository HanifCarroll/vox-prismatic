using Microsoft.AspNetCore.Mvc;

namespace ContentCreation.Api.Infrastructure.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public ActionResult<object> GetHealth()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "v2"
        });
    }
}