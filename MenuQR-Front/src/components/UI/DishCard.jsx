'use client';

import React from 'react';
import MyButton from './Button';
import { FaPen, FaTrash } from 'react-icons/fa';

const DishCard = ({
  image,
  name,
  description,
  price,
  onUpdate,
  onDelete,
  showActions = true,
  id,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-start gap-4 p-5 rounded-2xl border border-gray-200 shadow-lg bg-white/40 backdrop-blur-sm transition-all hover:shadow-xl group">
      
      {/* Image */}
      <div className="w-full md:w-32 h-32 rounded-xl overflow-hidden bg-gray-100 relative">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover object-center transform transition-transform duration-300 group-hover:scale-110"
        />
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-800">{name}</h3>
          <p className="text-sm text-gray-600">{description}</p>
          {price && (
            <p className="text-sm font-semibold text-yellow-600 mt-12">
              <span className="bg-yellow-100 rounded-full px-4 py-2">{price}</span>
            </p>
          )}
        </div>

        {showActions && (
          <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {onUpdate && (
              <MyButton
                onClick={() => onUpdate(id)} 
                className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1 text-sm flex items-center gap-1"
              >
                <FaPen className="text-xs" />
                Update
              </MyButton>
            )}
            {onDelete && (
              <MyButton
                onClick={() => onDelete(id)}
                className="bg-red-400 hover:bg-red-500 text-white px-3 py-1 text-sm flex items-center gap-1"
              >
                <FaTrash className="text-xs" />
                Delete
              </MyButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DishCard;
