-- Basic Lean 4 Examples for NextLean

-- Simple theorem proving
theorem hello_lean : True := by
  trivial

-- Basic arithmetic
theorem two_plus_two : 2 + 2 = 4 := by
  rfl

-- Using simp tactic
theorem add_zero (n : Nat) : n + 0 = n := by
  simp [Nat.add_zero]

-- Pattern matching example
def factorial : Nat → Nat
  | 0 => 1
  | n + 1 => (n + 1) * factorial n

-- Proof by induction
theorem factorial_pos (n : Nat) : 0 < factorial n := by
  induction n with
  | zero => simp [factorial]
  | succ n ih =>
    simp [factorial]
    exact Nat.mul_pos (Nat.succ_pos n) ih

-- List operations
example (xs : List Nat) : xs.length = xs.reverse.length := by
  simp [List.length_reverse]

-- Type classes
instance : Add String where
  add a b := a ++ b

#eval "Hello " + "World!"

-- Propositions and proofs
example (P Q : Prop) : P ∧ Q → Q ∧ P := by
  intro h
  cases h with
  | mk hp hq => exact ⟨hq, hp⟩

-- Higher-order functions
def twice (f : Nat → Nat) (x : Nat) : Nat := f (f x)

#eval twice (· + 1) 5
