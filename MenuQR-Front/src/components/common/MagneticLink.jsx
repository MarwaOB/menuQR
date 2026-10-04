import { Link } from 'react-router-dom';
import useMagnetic from '../../hooks/useMagnetic';
import Arrow from './Arrow';

/**
 * Call-to-action pill. Renders a router <Link> for `to`, an <a> for `href`
 * (in-page anchors), otherwise a <button>.
 */
export default function MagneticLink({
  to,
  href,
  variant = 'primary',
  arrow = true,
  className = '',
  children,
  ...props
}) {
  const ref = useMagnetic();
  const classes = `btn btn-${variant} ${className}`;
  const content = (
    <>
      <span>{children}</span>
      {arrow && <Arrow />}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} type="button" className={classes} {...props}>
      {content}
    </button>
  );
}
