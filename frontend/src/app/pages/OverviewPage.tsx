import { Header } from '../components/Header';
import { TabNavigation } from '../components/TabNavigation';

const models = [
  {
    title: 'U-Net',
    description: 'Arhitectură de segmentare pixel-level folosită pentru identificarea precisă a conturului fracturilor. Modelul utilizează un encoder EfficientNet-B3 pre-antrenat și un decoder simetric cu skip connections pentru a păstra detaliile spațiale.',
    task: 'Segementations',
    color: 'bg-purple-100 text-purple-700',
    image: 'https://lmb.informatik.uni-freiburg.de/people/ronneber/u-net/u-net-architecture.png',
    hasImage: true,
  },
  {
    title: 'YOLOv8m-seg',
    description: 'Model de detecție în timp real care identifică locația fracturilor prin bounding boxes și generează simultan măști de segmentare. Optimizat pentru procesare rapidă a imaginilor medicale.',
    task: 'Detections',
    color: 'bg-blue-100 text-blue-700',
    hasImage: false,
  },
  {
    title: 'EfficientNet-B2',
    description: 'Clasificator anatomic care identifică regiunea osoasă din radiografie: mână, picior, șold sau umăr. Folosește transfer learning de la ImageNet adaptat pentru imagini medicale.',
    task: 'Clasification',
    color: 'bg-green-100 text-green-700',
    hasImage: false,
  },
  {
    title: 'EfficientNet-B0',
    description: 'Model lightweight pentru clasificarea tipului de fractură: oblică, cominutivă, greenstick, hairline sau spirală. Antrenat cu tehnici de augmentare pentru date medicale dezechilibrate.',
    task: 'Clasification',
    color: 'bg-green-100 text-green-700',
    hasImage: false,
  },
  {
    title: 'Random Forest',
    description: 'Clasificator binar bazat pe features de textură (GLCM și LBP) pentru detectarea fracturilor. Ensemble de 500 arbori de decizie oferă predicții robuste și interpretabile.',
    task: 'Clasification',
    color: 'bg-green-100 text-green-700',
    hasImage: false,
  },
];

export function OverviewPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F0F0' }}>
      <Header />
      <TabNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Bone Fracture Detection
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-3xl">
            Advanced AI-powered system for automatic detection, segmentation, and classification
            of bone fractures from X-ray images using state-of-the-art deep learning models.
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Models Used</h2>
          <div className="space-y-6">
            {models.map((model) => (
              <div
                key={model.title}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {model.hasImage ? (
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">{model.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${model.color}`}>
                        {model.task}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      {model.description}
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                      <img
                        src={model.image}
                        alt={`${model.title} architecture`}
                        className="max-w-full h-auto object-contain"
                        style={{ maxHeight: '400px' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">{model.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${model.color}`}>
                        {model.task}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {model.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
