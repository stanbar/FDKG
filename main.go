package main

import (
	"fmt"

	"github.com/iden3/go-iden3-crypto/babyjub"
)

// BabyJubJub key
func main() {

	// generate babyJubjub private key randomly
	babyJubjubPrivKey := babyjub.NewRandPrivKey()

	// generate public key from private key
	babyJubjubPubKey := babyJubjubPrivKey.Public()

	// print public key
	fmt.Println(babyJubjubPubKey)
}
