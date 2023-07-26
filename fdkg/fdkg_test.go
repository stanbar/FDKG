package main

import (
	"math/big"
	"testing"
)

func TestNewLocalParty(t *testing.T) {
	n := 4
	nodes := createRandomNodes(n, big.NewInt(7), 2)
	if len(nodes) != n {
		t.Errorf("Expected %d nodes, got %d", n, len(nodes))
	}
}
