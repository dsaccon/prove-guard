import Lake
open Lake DSL

package ProveGuard where
  leanOptions := #[
    ⟨`autoImplicit, false⟩
  ]

@[default_target]
lean_lib ProveGuard where
  srcDir := "."
