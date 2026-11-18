using System.Security.Claims;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Server.ProtectedBrowserStorage;

namespace TTWSeating.Authentication;

public sealed class SessionAuthenticationStateProvider : AuthenticationStateProvider
{
    private readonly ProtectedLocalStorage _localStorage;
    private readonly ProtectedSessionStorage _sessionStorage;
    private ClaimsPrincipal _currentUser = new(new ClaimsIdentity());

    public SessionAuthenticationStateProvider(ProtectedLocalStorage localStorage, ProtectedSessionStorage sessionStorage)
    {
        _localStorage = localStorage;
        _sessionStorage = sessionStorage;
    }

    public bool IsInitialized { get; private set; }
    public bool IsAuthenticated => _currentUser.Identity?.IsAuthenticated == true;

    public override Task<AuthenticationState> GetAuthenticationStateAsync() =>
        Task.FromResult(new AuthenticationState(_currentUser));

    public async Task InitializeAsync()
    {
        if (IsInitialized)
        {
            return;
        }

        var userId = await _localStorage.GetAsync<string>("UserId");
        var email = await _localStorage.GetAsync<string>("UserEmail");
        if (IsValidUser(userId.Value, email.Value))
        {
            SetAuthenticatedUser(userId.Value!, email.Value!);
        }
        else
        {
            var sessionUserId = await _sessionStorage.GetAsync<string>("UserId");
            var sessionEmail = await _sessionStorage.GetAsync<string>("UserEmail");
            if (sessionUserId.Success && sessionEmail.Success && IsValidUser(sessionUserId.Value, sessionEmail.Value))
            {
                await _localStorage.SetAsync("UserId", sessionUserId.Value);
                await _localStorage.SetAsync("UserEmail", sessionEmail.Value);
                SetAuthenticatedUser(sessionUserId.Value!, sessionEmail.Value!);
            }
        }

        IsInitialized = true;
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    public async Task SignInAsync(string userId, string email)
    {
        await _localStorage.SetAsync("UserId", userId);
        await _localStorage.SetAsync("UserEmail", email);
        SetAuthenticatedUser(userId, email);
        IsInitialized = true;
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    public async Task SignOutAsync()
    {
        await _localStorage.DeleteAsync("UserId");
        await _localStorage.DeleteAsync("UserEmail");
        _currentUser = new ClaimsPrincipal(new ClaimsIdentity());
        IsInitialized = true;
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    private static bool IsValidUser(string? userId, string? email) =>
        !string.IsNullOrWhiteSpace(userId) && userId != "0" && !string.IsNullOrWhiteSpace(email);

    private void SetAuthenticatedUser(string userId, string email)
    {
        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Name, email)
        ],
        authenticationType: "ProtectedBrowserStorage");

        _currentUser = new ClaimsPrincipal(identity);
    }
}
