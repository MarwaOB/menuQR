import { useContext } from 'react';
import { SceneContext } from './sceneStore';
import PlateIllustration from './PlateIllustration';

/**
 * An invisible box in the page layout that the 3D dish flies to while this
 * stage is the closest one to the centre of the viewport. Position and size
 * come from the element's bounding box, so layouts stay fully responsive.
 *
 * tilt     – how far the plate leans toward the camera (radians)
 * turn     – extra yaw (radians)
 * explode  – let the craft section pull the ingredients apart
 */
export default function SceneStage({ name, tilt = 0.55, turn = 0, explode = false, className = '' }) {
  const { webgl } = useContext(SceneContext);

  return (
    <div
      data-scene-stage={name}
      data-tilt={tilt}
      data-turn={turn}
      data-explode={explode ? 'true' : undefined}
      aria-hidden="true"
      className={`relative ${className}`}
    >
      {!webgl && <PlateIllustration className="absolute inset-0 m-auto h-full w-full max-h-full max-w-full" />}
    </div>
  );
}
