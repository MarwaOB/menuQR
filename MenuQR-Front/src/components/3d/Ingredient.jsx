import { forwardRef } from 'react';

// Small building blocks shared by the plated dish and the orbiting garnish.
// Each forwards its ref to the outer group so callers can animate it.

export const Tomato = forwardRef(function Tomato({ g, m, ...props }, ref) {
  return (
    <group ref={ref} {...props}>
      <mesh geometry={g.tomato} material={m.skin} />
      <mesh geometry={g.calyx} material={m.calyx} position={[0, 0.128, 0]} />
    </group>
  );
});

export const TomatoHalf = forwardRef(function TomatoHalf({ g, m, ...props }, ref) {
  return (
    <group ref={ref} {...props}>
      <mesh geometry={g.halfSkin} material={m.skin} />
      <mesh geometry={g.halfFlesh} material={m.flesh} />
      <mesh geometry={g.halfSeeds} material={m.seeds} />
    </group>
  );
});

export const Leaf = forwardRef(function Leaf({ g, m, ...props }, ref) {
  return (
    <group ref={ref} {...props}>
      <mesh geometry={g.leaf} material={m.leaf} />
    </group>
  );
});

export const Peppercorn = forwardRef(function Peppercorn({ g, m, ...props }, ref) {
  return (
    <group ref={ref} {...props}>
      <mesh geometry={g.fleck} material={m.pepper} scale={0.05} />
    </group>
  );
});
