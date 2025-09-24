"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch } from "@/redux/hooks";
import {
  setSelectedBook,
  setSelectedFile,
} from "@/redux/features/audio/audioSlice";

interface AudioBook {
  id: string;
  title: string;
  description: string;
  color: string;
  files: string[];
}

export default function Home() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [selectedBook, setSelectedBookLocal] = useState<string>("");
  const [selectedUnit, setSelectedUnitLocal] = useState<string>("");
  const [selectedLesson, setSelectedLessonLocal] = useState<string>("");

  // Audio books configuration
  const audioBooks: AudioBook[] = [
    {
      id: "cambridge-vocab-advanced",
      title: "Cambridge Vocabulary Advanced in Use",
      description: "Advanced vocabulary building exercises",
      color: "blue",
      files: [
        "U_001.A.mp3",
        "U_001.B.mp3",
        "U_001.C.mp3",
        "U_002.A.mp3",
        "U_002.B.mp3",
      ],
    },
    {
      id: "cambridge-grammar-intermediate",
      title: "Cambridge Grammar Intermediate in Use",
      description: "Intermediate grammar exercises with practical examples",
      color: "green",
      files: ["G_001.A.mp3", "G_001.B.mp3", "G_002.A.mp3"],
    },
    {
      id: "cambridge-listening-advanced",
      title: "Cambridge Listening Advanced",
      description: "Advanced listening comprehension with native speakers",
      color: "purple",
      files: ["L_001.A.mp3", "L_001.B.mp3"],
    },
  ];

  const getCurrentBook = () =>
    audioBooks.find((book) => book.id === selectedBook);

  // Extract units from files
  const getAvailableUnits = () => {
    const files = getCurrentBook()?.files || [];
    const units = [...new Set(files.map(file => file.split('.')[0]))];
    return units.sort();
  };

  // Extract lessons for selected unit
  const getAvailableLessons = () => {
    const files = getCurrentBook()?.files || [];
    const unitFiles = files.filter(file => file.startsWith(selectedUnit + '.'));
    return unitFiles.map(file => file.split('.')[1]).sort();
  };

  // Get the complete filename
  const getSelectedFile = () => {
    if (selectedUnit && selectedLesson) {
      return `${selectedUnit}.${selectedLesson}.mp3`;
    }
    return "";
  };

  const handleBookSelect = (bookId: string) => {
    setSelectedBookLocal(bookId);
    setSelectedUnitLocal("");
    setSelectedLessonLocal("");
  };

  const handleUnitSelect = (unit: string) => {
    setSelectedUnitLocal(unit);
    setSelectedLessonLocal("");
  };

  const handleLessonSelect = (lesson: string) => {
    setSelectedLessonLocal(lesson);
  };

  const handleBackToBooks = () => {
    setSelectedBookLocal("");
    setSelectedUnitLocal("");
    setSelectedLessonLocal("");
  };

  const handleBackToUnits = () => {
    setSelectedUnitLocal("");
    setSelectedLessonLocal("");
  };

  const handleStartPractice = () => {
    const fileName = getSelectedFile();
    if (selectedBook && fileName) {
      dispatch(setSelectedBook(selectedBook));
      dispatch(setSelectedFile(fileName));
      router.push(`/practice?book=${selectedBook}&file=${fileName}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.h1 
        className="text-3xl font-bold text-gray-900 mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        📚 Cambridge Audio Books
      </motion.h1>

      <div className="relative">
        <AnimatePresence mode="wait">
          {!selectedBook ? (
            // Book Selection View
            <motion.div
              key="books"
              initial={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="mb-8"
            >
              <h2 className="text-xl font-semibold mb-4">Select a Book</h2>
              <div className="space-y-3">
                {audioBooks.map((book, index) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => handleBookSelect(book.id)}
                    className="p-4 rounded-lg border-2 cursor-pointer transition-colors border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <h3 className="font-semibold text-gray-800">{book.title}</h3>
                    <p className="text-sm text-gray-600">{book.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : !selectedUnit ? (
            // Unit Selection View
            <motion.div
              key="units"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="mb-8"
            >
              {/* Back Button */}
              <motion.button
                onClick={handleBackToBooks}
                className="mb-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                whileHover={{ x: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="mr-2">←</span>
                Back to Books
              </motion.button>

              {/* Selected Book Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <h3 className="font-semibold text-blue-800">{getCurrentBook()?.title}</h3>
                <p className="text-sm text-blue-600">{getCurrentBook()?.description}</p>
              </motion.div>

              <h2 className="text-xl font-semibold mb-4">Select a Unit</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {getAvailableUnits().map((unit, index) => (
                  <motion.button
                    key={unit}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                    onClick={() => handleUnitSelect(unit)}
                    className="p-4 rounded-lg border-2 cursor-pointer transition-colors border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-lg font-semibold text-gray-800">
                      {unit.replace('_', ' ')}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            // Lesson Selection View
            <motion.div
              key="lessons"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="mb-8"
            >
              {/* Back Button */}
              <motion.button
                onClick={handleBackToUnits}
                className="mb-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                whileHover={{ x: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="mr-2">←</span>
                Back to Units
              </motion.button>

              {/* Selected Book & Unit Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <h3 className="font-semibold text-blue-800">{getCurrentBook()?.title}</h3>
                <p className="text-sm text-blue-600">
                  {selectedUnit.replace('_', ' ')} - Select a lesson
                </p>
              </motion.div>

              <h2 className="text-xl font-semibold mb-4">Select a Lesson</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {getAvailableLessons().map((lesson, index) => (
                  <motion.button
                    key={lesson}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                    onClick={() => handleLessonSelect(lesson)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedLesson === lesson
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-lg font-semibold text-gray-800">
                      Lesson {lesson}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Start Practice Button */}
              <AnimatePresence>
                {selectedLesson && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="text-center mt-8"
                  >
                    <motion.button
                      onClick={handleStartPractice}
                      className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Start Practice Session
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
