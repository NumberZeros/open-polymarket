/**
 * Product Hunt Badge Component
 * Displays the official Product Hunt badge linking to the BetHub product page
 */

export function ProductHuntBadge() {
  return (
    <div className="flex justify-center py-4">
      <a 
        href="https://www.producthunt.com/products/bethub?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-bethub" 
        target="_blank"
        rel="noopener noreferrer"
        title="BetHub on Product Hunt"
      >
        <img 
          src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1048877&theme=dark&t=1765421735402" 
          alt="BetHub - Prediction markets | Product Hunt" 
          style={{ width: '250px', height: '54px' }} 
          width={250} 
          height={54}
          loading="lazy"
        />
      </a>
    </div>
  );
}
