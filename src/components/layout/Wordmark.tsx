/** marca Frésia: logo + wordmark serif con el tagline del menú */
export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const lg = size === 'lg'
  return (
    <span className="flex items-center gap-2.5">
      <img src="/icons/icon-192.png" alt="" className={lg ? 'h-11 w-11' : 'h-9 w-9'} />
      <span className="flex flex-col leading-none">
        <span className={`font-display font-bold text-berry-500 ${lg ? 'text-[28px]' : 'text-[22px]'}`}>Frésia</span>
        <span className={`uppercase tracking-[0.22em] text-berry-900/45 ${lg ? 'text-[9px]' : 'text-[8px]'}`}>
          fresas con crema
        </span>
      </span>
    </span>
  )
}
