package zksnark

import (
	"encoding/json"
	"fmt"
	"os"
	"testing"

	witness "github.com/iden3/go-rapidsnark/witness/v2"
	"github.com/iden3/go-rapidsnark/witness/wazero"
	wasm3 "github.com/iden3/go-wasm3"
	"github.com/stretchr/testify/require"
)

func Test(t *testing.T) {
	wasmFilename := "../../circuits/build/multiplier/multiplier_js/multiplier.wasm"
	inputsFilename := "input.json"

	engine := wazero.NewCircom2WZWitnessCalculator

	wasmBytes, err := os.ReadFile(wasmFilename)
	require.NoError(t, err)

	ops := witness.WithWasmEngine(engine)
	calc, err := witness.NewCalculator(wasmBytes, ops)
	inputBytes, err := os.ReadFile(inputsFilename)
	require.NoError(t, err)

	inputs, err := witness.ParseInputs(inputBytes)
	require.NoError(t, err)

	wtns, err2 := calc.CalculateWitness(inputs, true)
	require.NoError(t, err2)
	require.NotEmpty(t, wtns)

	wtnsBin, err2 := calc.CalculateBinWitness(inputs, true)
	require.NoError(t, err2)
	require.NotEmpty(t, wtnsBin)

	wtnsBin, err2 = calc.CalculateWTNSBin(inputs, true)
	require.NoError(t, err2)
	require.NotEmpty(t, wtns)

	// TODO: continute with prover
}
