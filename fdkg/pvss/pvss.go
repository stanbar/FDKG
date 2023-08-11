package pvss

import (
	"crypto"
	"crypto/elliptic"
	"errors"
	"math/big"
	"math/rand"

	"github.com/delendum-xyz/private-voting/fdkg/common"
	"github.com/delendum-xyz/private-voting/fdkg/dleq"
	"github.com/delendum-xyz/private-voting/fdkg/polynomial"
	"github.com/delendum-xyz/private-voting/fdkg/utils"
	"github.com/samber/lo"
)

type Escrow struct {
	extraGenerator common.Point
	polynomial     polynomial.Polynomial
	secret         common.Point
	proof          dleq.DLEQProof
}

type Commitment struct {
	point common.Point
}

type ShareId int64
type EncryptedShare struct {
	id           ShareId
	encryptedVal common.Point
	proof        dleq.DLEQProof
}

type DecryptedShare struct {
	id           ShareId
	decryptedVal common.Point
	proof        dleq.DLEQProof
}

type PublicKey common.Point

// Escrow creates a new escrow parameter.
// The only parameter needed is the threshold necessary to be able to reconstruct.
func CreateEscrow(drg *rand.Rand, t int, curve elliptic.Curve) (*Escrow, error) {
	if t < 1 {
		return nil, errors.New("threshold is invalid; < 1")
	}

	poly := polynomial.RandomPolynomial(t, curve, drg)
	gen := utils.HashToPoint(curve.Params().Gx.Bytes(), curve)

	secret := poly.Evaluate(0)
	g_s := common.BigIntToPoint(curve.ScalarBaseMult(secret.Bytes()))

	challenge := utils.RandomBigIntCrypto(curve)

	baseGenerator := common.BigIntToPoint(curve.Params().Gx, curve.Params().Gy)
	H2 := common.BigIntToPoint(curve.ScalarMult(&gen.X, &gen.Y, secret.Bytes()))

	DLEQ := dleq.DLEQ{
		G1: &baseGenerator,
		H1: &g_s,
		G2: gen,
		H2: &H2,
	}

	proof := dleq.NewProof(&challenge, &secret, DLEQ, crypto.SHA256, curve)

	return &Escrow{
		extraGenerator: *gen,
		polynomial:     poly,
		secret:         g_s,
		proof:          proof,
	}, nil
}

func Commitments(escrow Escrow, curve elliptic.Curve) []Commitment {
	return lo.Map(escrow.polynomial.Coefficients(), func(coeff big.Int, index int) Commitment {
		commitment := common.BigIntToPoint(curve.ScalarMult(&escrow.extraGenerator.X, &escrow.extraGenerator.Y, coeff.Bytes()))
		return Commitment{
			point: commitment,
		}
	})
}

func CreateShare(drg *rand.Rand, escrow Escrow, shareId ShareId, pubKey common.Point, curve elliptic.Curve) EncryptedShare {
	peval := escrow.polynomial.Evaluate(int64(shareId))
	challenge := utils.RandomBigIntCrypto(curve)
	xi := common.BigIntToPoint(curve.ScalarMult(&escrow.extraGenerator.X, &escrow.extraGenerator.Y, peval.Bytes()))
	yi := common.BigIntToPoint(curve.ScalarMult(&pubKey.X, &pubKey.Y, peval.Bytes()))

	DLEQ := dleq.DLEQ{
		G1: &escrow.extraGenerator,
		H1: &xi,
		G2: &pubKey,
		H2: &yi,
	}
	proof := dleq.NewProof(&challenge, &peval, DLEQ, crypto.SHA256, curve)
	return EncryptedShare{
		id:           shareId,
		encryptedVal: yi,
		proof:        proof,
	}
}

func CreateShares(drg *rand.Rand, escrow Escrow, pubKeys []common.Point, curve elliptic.Curve) []EncryptedShare {
	return lo.Map(pubKeys, func(pubKey common.Point, index int) EncryptedShare {
		return CreateShare(drg, escrow, ShareId(index), pubKey, curve)
	})
}

func CreateXi(id ShareId, commitments []Commitment, curve elliptic.Curve) common.Point {
	r := common.PointZero()
	for j, commit := range commitments {
		e := new(big.Int).Exp(big.NewInt(int64(id)), big.NewInt(int64(j)), curve.Params().N)
		r_temp_X, r_temp_Y := curve.ScalarMult(&commit.point.X, &commit.point.Y, e.Bytes())
		r = common.BigIntToPoint(curve.Add(&r.X, &r.Y, r_temp_X, r_temp_Y))
	}
	return r
}

func (e *EncryptedShare) Verify(id ShareId, pubKey common.Point, extraGenerator common.Point, commitments []Commitment, curve elliptic.Curve) bool {
	xi := CreateXi(id, commitments, curve)
	DLEQ := dleq.DLEQ{
		G1: &extraGenerator,
		H1: &xi,
		G2: &pubKey,
		H2: &e.encryptedVal,
	}
	return e.proof.Verify(DLEQ, curve)
}

func (d *DecryptedShare) Verify(pubKey common.Point, eshare EncryptedShare, curve elliptic.Curve) bool {
	generatorPoint := common.BigIntToPoint(curve.Params().Gx, curve.Params().Gy)
	DLEQ := dleq.DLEQ{
		G1: &generatorPoint,
		H1: &pubKey,
		G2: &d.decryptedVal,
		H2: &eshare.encryptedVal,
	}
	return d.proof.Verify(DLEQ, curve)
}

func DecryptShare(drq *rand.Rand, privKey big.Int, pubKey common.Point, share EncryptedShare, curve elliptic.Curve) DecryptedShare {
	challenge := utils.RandomBigInt(curve, drq)
	xi := privKey
	yi := pubKey
	liftedYi := share.encryptedVal
	xiInverse := new(big.Int).ModInverse(&xi, curve.Params().N)
	si := common.BigIntToPoint(curve.ScalarMult(&liftedYi.X, &liftedYi.Y, xiInverse.Bytes()))
	generatorPoint := common.BigIntToPoint(curve.Params().Gx, curve.Params().Gy)
	DLEQ := dleq.DLEQ{
		G1: &generatorPoint,
		H1: &yi,
		G2: &si,
		H2: &liftedYi,
	}
	proof := dleq.NewProof(&challenge, &xi, DLEQ, crypto.SHA256, curve)
	return DecryptedShare{
		id:           share.id,
		decryptedVal: si,
		proof:        proof,
	}

}

func InterpolateOne(t int, sid int, shares []DecryptedShare, curve elliptic.Curve) big.Int {
	v := big.NewInt(1)
	for j := 0; j < t; j++ {
		if j != sid {
			sj := big.NewInt(int64(shares[j].id))
			si := big.NewInt(int64(shares[sid].id))
			denominator := sj.Sub(sj, si)
			denominator.ModInverse(denominator, curve.Params().N)
			e := sj.Mul(sj, denominator)
			v.Mul(v, e)
		}
	}
	return *v.Mod(v, curve.Params().N)
}

func Recover(t int, shares []DecryptedShare, curve elliptic.Curve) common.Point {
	if t > len(shares) {
		panic("Not enough shares to recover")
	}

	result := common.PointZero()
	for i := 0; i < t; i++ {
		v := InterpolateOne(t, i, shares, curve)
		decryptedVal := shares[i].decryptedVal
		X, Y := curve.ScalarMult(&decryptedVal.X, &decryptedVal.Y, v.Bytes())
		result = common.BigIntToPoint(curve.Add(&result.X, &result.Y, X, Y))
	}
	return result
}

func VerifySecret(secret common.Point, extraGenerator common.Point, commitments []Commitment, proof dleq.DLEQProof, curve elliptic.Curve) bool {
	generatorPoint := common.BigIntToPoint(curve.Params().Gx, curve.Params().Gy)
	DLEQ := dleq.DLEQ{
		G1: &generatorPoint,
		H1: &secret,
		G2: &extraGenerator,
		H2: &commitments[0].point,
	}
	return proof.Verify(DLEQ, curve)
}
