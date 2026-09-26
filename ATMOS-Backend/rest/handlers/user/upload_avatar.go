package user

import (
	"context"
	"net/http"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"

	"backend/util"
)

func (h *Handler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		util.SendError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// 5MB max
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		util.SendError(w, http.StatusBadRequest, "file too large (max 5MB)")
		return
	}

	file, _, err := r.FormFile("avatar")
	if err != nil {
		util.SendError(w, http.StatusBadRequest, "avatar file is required")
		return
	}
	defer file.Close()

	// connect to Cloudinary
	cld, err := cloudinary.NewFromParams(
		h.cnf.CloudinaryCloudName,
		h.cnf.CloudinaryAPIKey,
		h.cnf.CloudinaryAPISecret,
	)
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to connect to Cloudinary")
		return
	}

	// upload — use userID as public_id so each user has one avatar (overwrites old one)
	result, err := cld.Upload.Upload(context.Background(), file, uploader.UploadParams{
		PublicID: "atmos/avatars/" + userID,
		Folder:   "atmos/avatars",
	})
	if err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to upload avatar")
		return
	}

	if err := h.userRepo.UpdateAvatar(userID, result.SecureURL); err != nil {
		util.SendError(w, http.StatusInternalServerError, "failed to save avatar URL")
		return
	}

	util.SendData(w, http.StatusOK, map[string]string{
		"avatar_url": result.SecureURL,
	})
}
