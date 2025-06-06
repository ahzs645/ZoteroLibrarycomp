import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Article {
  id: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  doi?: string;
  url?: string;
  abstract?: string;
  source: 'portal' | 'search' | 'both';
  collections?: string[];
}

interface ArticleModalProps {
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArticleModal({ article, isOpen, onClose }: ArticleModalProps) {
  if (!article) return null;

  // Get source badge color
  const getSourceBadge = (source: 'portal' | 'search' | 'both') => {
    switch (source) {
      case 'portal':
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-800">Portal</Badge>;
      case 'search':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Search</Badge>;
      case 'both':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Both</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start gap-2">
            <DialogTitle className="text-xl">{article.title}</DialogTitle>
            {getSourceBadge(article.source)}
          </div>
          <DialogDescription className="text-base font-medium text-gray-700">
            {article.authors}
          </DialogDescription>
          <div className="text-sm text-gray-600">
            {article.journal} ({article.year})
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {article.abstract && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Abstract</h4>
              <p className="text-gray-600 text-sm whitespace-pre-line">{article.abstract}</p>
            </div>
          )}

          <Separator />

          {article.collections && article.collections.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Collections</h4>
              <div className="flex flex-wrap gap-2">
                {article.collections.map((collection, idx) => (
                  <Badge key={idx} variant="secondary">
                    {collection}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(article.doi || article.url) && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Links</h4>
              <div className="flex flex-wrap gap-2">
                {article.doi && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-indigo-600"
                    onClick={() => window.open(`https://doi.org/${article.doi}`, '_blank')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    DOI: {article.doi}
                  </Button>
                )}
                {article.url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-indigo-600"
                    onClick={() => window.open(article.url, '_blank')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    View Article
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}