package types

type JwtClaim struct {
	ID      int    `json:"id"`
	Role    string `json:"role"`
	IsDummy bool   `json:"is_dummy"`
}
