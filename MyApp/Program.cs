using System.Net;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Server;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ServiceStack.Blazor;
using MyApp.Components;
using MyApp.Data;
using MyApp.Components.Account;
using MyApp.ServiceInterface;

var builder = WebApplication.CreateBuilder(args);

var services = builder.Services;
var config = builder.Configuration;

// Add services to the container.
services.AddRazorComponents();

services.AddCascadingAuthenticationState();
services.AddScoped<IdentityUserAccessor>();
services.AddScoped<IdentityRedirectManager>();
services.AddScoped<AuthenticationStateProvider, ServerAuthenticationStateProvider>();

services.AddAuthorization();
var authBuilder = services.AddAuthentication(options => {
    options.DefaultScheme = IdentityConstants.ApplicationScheme;
    options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
});
if (AppConfig.Instance.GoogleClientId != null)
{
    authBuilder.AddGoogle(options => {
        options.ClientId = AppConfig.Instance.GoogleClientId;
        options.ClientSecret = AppConfig.Instance.GoogleClientSecret!;
        options.ClaimActions.MapJsonKey("urn:google:profile", "profile");
        options.ClaimActions.MapJsonKey("urn:google:image", "picture");
    });
}
authBuilder.AddIdentityCookies();

services.Configure<IdentityOptions>(options => {
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
    //options.User.RequireUniqueEmail = false;
});

services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(config.GetAppDataPath()));

services.AddDatabaseDeveloperPageExceptionFilter();

services.AddIdentityCore<ApplicationUser>(options => options.SignIn.RequireConfirmedAccount = true)
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

// Uncomment to send emails with SMTP, configure SMTP with "SmtpConfig" in appsettings.json
// services.AddSingleton<IEmailSender<ApplicationUser>, EmailSender>();
services.TryAddSingleton<IEmailSender<ApplicationUser>, IdentityNoOpEmailSender>();

services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, AdditionalUserClaimsPrincipalFactory>();

var baseUrl = builder.Configuration["ApiBaseUrl"] ??
    (builder.Environment.IsDevelopment() ? "https://localhost:5001" : "http://" + IPAddress.Loopback);
services.AddScoped(c => new HttpClient { BaseAddress = new Uri(baseUrl) });
services.AddBlazorServerIdentityApiClient(baseUrl);
services.AddLocalStorage();

services.AddServiceStack(typeof(MyServices).Assembly);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseMigrationsEndPoint();
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

// app.UseHttpsRedirection();

app.UseStaticFiles();
app.UseAntiforgery();

app.MapRazorComponents<App>();

// Add additional endpoints required by the Identity /Account Razor components.
app.MapAdditionalIdentityEndpoints();

// Requires .NET 9
// app.UseServerEvents();

app.UseServiceStack(new AppHost(), options => {
    options.MapEndpoints();
});

BlazorConfig.Set(new()
{
    Services = app.Services,
    JSParseObject = JS.ParseObject,
    IsDevelopment = app.Environment.IsDevelopment(),
    EnableLogging = app.Environment.IsDevelopment(),
    EnableVerboseLogging = app.Environment.IsDevelopment(),
});

app.Run();
