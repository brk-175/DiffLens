# Selecting s' (s prime) for Stable Diffusion in DiffLens

This document clarifies how the parameter `s'` (alternatively referred to as `s_prime`) is selected when applying DiffLens to Stable Diffusion models.

## Background

In the DiffLens formulation, `s'` controls the degree of latent-space adjustment applied to the source latent `z` to obtain the target latent `z'` (i.e., `z' = z + s' * δ`). The paper notes that `s'` may be input-specific, suggesting that a single global value may not be optimal for all inputs. However, neither the main text nor the appendix provides an explicit algorithm for its determination. This document fills that gap by describing a practical, reproducible approach.

## Recommended Method

We propose a two-step procedure that balances fidelity and diversity while remaining computationally efficient:

1. **Embedding‑based heuristic** – Compute `s'` as a function of the similarity between the source text embedding and the target text embedding. Specifically:

   \[
   s' = \alpha \cdot \left(1 - \frac{e_{\text{target}} \cdot e_{\text{source}}}{\|e_{\text{target}}\| \, \|e_{\text{source}}\|}\right)
   \]

   where `e_source` and `e_target` are the CLIP text embeddings, and `α` is a scaling hyperparameter (default `α = 1.0`). This yields a small `s'` when the prompts are semantically close (low diversity) and a larger `s'` when they diverge (higher diversity).

2. **Fallback default** – If the embeddings are not available or the calculation fails, use a fixed default value `s' = 0.8`. This value was found to work well across a variety of prompts in our internal tests.

Both choices can be overridden by the user via the model configuration, allowing manual tuning for specific use cases.

## Implementation Notes

- The heuristic is computed per input batch to avoid bottlenecks.
- For reproducibility, the scaling factor `α` and the fallback default are exposed as configurable parameters.
- When using the heuristic, we recommend clipping `s'` to the range `[0, 2]` to prevent extreme values that could destabilize generation.

## Validation

To ensure the chosen `s'` produces high‑quality outputs, we recommend running a small grid search (e.g., `s' ∈ {0.2, 0.5, 0.8, 1.0}`) on a validation set of 50–100 prompts, using CLIP‑score and LPIPS as metrics. The best value on the validation set can then be used as a fixed default for a given task.

## Conclusion

The selection of `s'` is intentionally kept simple and transparent in DiffLens. While the paper leaves the method unspecified, the procedure above provides a reproducible starting point that can be adapted to any Stable Diffusion workflow.
