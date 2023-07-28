package utils

func Map[T, U interface{}](arr []T, f func(T) U) []U {
	result := make([]U, len(arr))
	for i, v := range arr {
		result[i] = f(v)
	}
	return result
}
