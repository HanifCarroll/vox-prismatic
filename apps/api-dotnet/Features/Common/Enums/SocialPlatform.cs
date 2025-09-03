namespace ContentCreation.Api.Features.Common.Enums;

public enum SocialPlatform
{
    LinkedIn = 1,
    Twitter = 2,
    Facebook = 3,
    Instagram = 4
}

public static class SocialPlatformExtensions
{
    public static SocialPlatform? ToPlatformEnum(this string platformString)
    {
        return platformString?.ToLowerInvariant() switch
        {
            "linkedin" => SocialPlatform.LinkedIn,
            "twitter" => SocialPlatform.Twitter,
            "x" => SocialPlatform.Twitter,
            "facebook" => SocialPlatform.Facebook,
            "instagram" => SocialPlatform.Instagram,
            _ => null
        };
    }
    
    public static string GetDisplayName(this SocialPlatform platform)
    {
        return platform switch
        {
            SocialPlatform.LinkedIn => "LinkedIn",
            SocialPlatform.Twitter => "Twitter/X",
            SocialPlatform.Facebook => "Facebook",
            SocialPlatform.Instagram => "Instagram",
            _ => platform.ToString()
        };
    }
    
    public static string ToApiString(this SocialPlatform platform)
    {
        return platform.ToString().ToLowerInvariant();
    }
}