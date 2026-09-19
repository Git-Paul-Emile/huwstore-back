-- Le paiement mobile (Wave, Orange Money) devient un moyen suivi, choisi par
-- la cliente au paiement, et non plus seulement une consigne affichee.
ALTER TYPE "PayMethod" ADD VALUE 'WAVE';
ALTER TYPE "PayMethod" ADD VALUE 'ORANGE_MONEY';
