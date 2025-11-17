import { useState } from 'react';
import { Handshake, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SearchPartnersView from './partnerships/SearchPartnersView';

type PartnershipView = 'search' | 'briefs' | 'providers' | 'clients';

export default function PartnershipTabContent() {
  const [activeView, setActiveView] = useState<PartnershipView>('search');
  const [searchQuery, setSearchQuery] = useState<string>('');

  return (
    <div className="h-full overflow-auto bg-grey-100">
      {/* Header */}
      <div className="bg-white border-b border-grey-400 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Handshake className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey">Partnerships</h1>
                <p className="text-sm text-grey-600">
                  Partner with other companies and manage your collaborations
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as PartnershipView)}>
            <TabsList className="w-full justify-start bg-grey-100">
              <TabsTrigger value="search" className="gap-2">
                <Search className="h-4 w-4" />
                Search Partners
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {activeView === 'search' && (
          <SearchPartnersView
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}
      </div>
    </div>
  );
}
