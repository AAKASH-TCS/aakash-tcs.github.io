export const EASE = [0.22, 1, 0.36, 1]

export const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.7, ease: EASE },
}

export const stagger = (i, step = 0.08) => ({
  ...fadeUp,
  transition: { ...fadeUp.transition, delay: i * step },
})
