package utils

import (
	"errors"
	"strings"
)

func YesNoToBool(yesNo string) (bool, error) {
	if strings.ToLower(yesNo) == "yes" {
		return true, nil
	}

	if strings.ToLower(yesNo) == "no" {
		return false, nil
	}

	return false, errors.New("invalid input")
}

func ImmunityToBool(immunity string) (bool, error) {
	if strings.ToLower(immunity) == "immune" {
		return true, nil
	}

	if strings.ToLower(immunity) == "not immune" {
		return false, nil
	}

	return false, errors.New("invalid input")
}
