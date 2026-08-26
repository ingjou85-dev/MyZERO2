import React from 'react';

interface CompanyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({ className = '', size = 'md' }) => {
  const logoUrl =
    'https://img1.wsimg.com/isteam/ip/f8facacd-269b-4f1d-b6bb-b2eabe7586ee/unipack%202-01.jpg/:/rs=w:225,h:75,cg:true,m/cr=w:225,h:75/qt=q:95';

  const heightClass = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-14 sm:h-16' : 'h-10 sm:h-12';

  return (
    <div id="company-logo-badge" className={`inline-flex items-center select-none py-0.5 ${className}`}>
      <img
        src={logoUrl}
        alt="UNIPACK Colombia S.A.S."
        className={`${heightClass} w-auto object-contain`}
        referrerPolicy="no-referrer"
        onError={(e) => {
          // Fallback if network blocked
          const target = e.currentTarget;
          target.style.display = 'none';
          if (target.nextElementSibling) {
            (target.nextElementSibling as HTMLElement).style.display = 'inline-flex';
          }
        }}
      />
      <div style={{ display: 'none' }} className="flex-col items-start select-none">
        <div className="flex items-center gap-1 font-black tracking-tight text-[#005baa] text-xl">
          <span>unipack</span>
        </div>
        <span className="text-[8px] tracking-widest text-[#78be20] font-bold uppercase -mt-1">
          colombia s.a.s.
        </span>
      </div>
    </div>
  );
};

