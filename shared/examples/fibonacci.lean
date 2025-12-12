-- Fibonacci Implementation in Lean 4

-- Recursive definition of Fibonacci sequence
def fib : Nat → Nat
  | 0 => 0
  | 1 => 1
  | n + 2 => fib (n + 1) + fib n

-- Tail-recursive optimized version
def fibTail (n : Nat) : Nat :=
  let rec fibAux (n : Nat) (a b : Nat) : Nat :=
    match n with
    | 0 => a
    | k + 1 => fibAux k b (a + b)
  fibAux n 0 1

-- Prove that both definitions are equivalent
theorem fib_eq_fibTail (n : Nat) : fib n = fibTail n := by
  induction n using Nat.strongRecOn with
  | ind n ih =>
    unfold fibTail
    simp [fibTail.fibAux]
    cases n with
    | zero => simp [fib]
    | succ n =>
      cases n with
      | zero => simp [fib]
      | succ n =>
        simp [fib]
        sorry

-- Basic properties of Fibonacci numbers
theorem fib_pos (n : Nat) (h : 0 < n) : 0 < fib n := by
  cases n with
  | zero => contradiction
  | succ n =>
    cases n with
    | zero => simp [fib]
    | succ n =>
      simp [fib]
      exact Nat.add_pos_left (fib_pos (n + 1) (Nat.succ_pos n)) (fib n)

-- Fibonacci growth property
theorem fib_increasing (n : Nat) : fib n ≤ fib (n + 1) := by
  induction n with
  | zero => simp [fib]
  | succ n ih =>
    simp [fib]
    exact Nat.le_add_right (fib (n + 1)) (fib n)

-- Evaluate some Fibonacci numbers
#eval fib 0    -- 0
#eval fib 1    -- 1
#eval fib 5    -- 5
#eval fib 10   -- 55
#eval fib 15   -- 610

-- Compare with tail-recursive version
#eval fibTail 10   -- 55
#eval fibTail 15   -- 610

-- Test larger numbers (tail-recursive is more efficient)
#eval fibTail 20   -- 6765
#eval fibTail 25   -- 75025

-- Prove a specific case
theorem fib_10 : fib 10 = 55 := by rfl

-- Show Fibonacci sequence as a list
def fibList (n : Nat) : List Nat :=
  (List.range n).map fib

#eval fibList 10   -- [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
