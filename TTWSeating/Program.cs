
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using TTWSeating.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor()
    .AddHubOptions(o =>
    {
        o.MaximumReceiveMessageSize = 1024 * 1024 * 5; // 5MB
    });

builder.Services.AddSignalR(o =>
{
    o.MaximumReceiveMessageSize = 1024 * 1024 * 5; // 5MB
});
builder.Services.AddSingleton<WeatherForecastService>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowASPNETApp", policy =>
    {
        policy.WithOrigins("https://localhost:59681", "http://localhost:59681")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}


app.UseCors();
app.UseStaticFiles();

app.UseRouting();

app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

app.Run();
