package user

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"backend/util"
)

func (h *Handler) googleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     h.cnf.GoogleClientID,
		ClientSecret: h.cnf.GoogleClientSecret,
		RedirectURL:  h.cnf.GoogleRedirectURL,
		Scopes:       []string{"email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

// GoogleLogin redirects the user to Google's consent screen
func (h *Handler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	// random state for CSRF protection
	b := make([]byte, 16)
	rand.Read(b)
	state := hex.EncodeToString(b)

	// store state in a short-lived cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		MaxAge:   300, // 5 minutes
		HttpOnly: true,
		Path:     "/",
	})

	url := h.googleOAuthConfig().AuthCodeURL(state, oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

type googleUserInfo struct {
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

// GoogleCallback handles the redirect back from Google
func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	// verify state matches (CSRF check)
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value != r.URL.Query().Get("state") {
		util.SendError(w, http.StatusBadRequest, "invalid oauth state")
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		util.SendError(w, http.StatusBadRequest, "missing authorization code")
		return
	}

	// exchange code for Google token
	googleToken, err := h.googleOAuthConfig().Exchange(context.Background(), code)
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to exchange token")
		return
	}

	// fetch user info from Google
	resp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + googleToken.AccessToken)
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to get user info from Google")
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to read Google response")
		return
	}

	var googleUser googleUserInfo
	if err := json.Unmarshal(body, &googleUser); err != nil || googleUser.Email == "" {
		util.SendError(w, http.StatusInternalServerError, "failed to parse Google user info")
		return
	}

	// find existing user or create new one
	user, err := h.userRepo.FindByEmail(googleUser.Email)
	if err != nil {
		randomBytes := make([]byte, 32)
		rand.Read(randomBytes)
		randomHash, _ := util.HashPassword(hex.EncodeToString(randomBytes))

		user, err = h.userRepo.CreateUser(googleUser.Name, googleUser.Email, randomHash)
		if err != nil {
			util.SendError(w, http.StatusInternalServerError, "failed to create user")
			return
		}
	}

	// generate JWT
	token, err := util.CreateJWT(h.cnf.SecretKey, util.CustomClaims{
		UserID: user.ID,
		Name:   user.Name,
		Email:  user.Email,
	})
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	// redirect to frontend dashboard with token in URL
	redirectURL := fmt.Sprintf("%s/dashboard?token=%s", h.cnf.FrontendURL, token)
	http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
}
