import React from 'react';
import DipendenteRendicontazioneForm from './components/DipendenteRendicontazioneForm';

const ParentComponent: React.FC = () => {
    const handleRendicontazioneSubmit = (data: any) => {
        console.log("Form submitted with data:", data);
    };

    return (
        <DipendenteRendicontazioneForm onRendicontazioneSubmitted={handleRendicontazioneSubmit} />
    );
};

export default ParentComponent;
