"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch } from "@/redux/hooks";
import {
  setSelectedBook,
  setSelectedFile,
} from "@/redux/features/audio/audioSlice";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AudioBook {
  id: string;
  title: string;
  description: string;
  level: "elementary" | "intermediate" | "upper-intermediate" | "advanced";
  category:
    | "vocabulary"
    | "grammar"
    | "idioms"
    | "collocations"
    | "speaking"
    | "pronunciation"
    | "listening";
  cover: string;
  isComingSoon?: boolean;
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
    // Vocabulary Books
    {
      id: "cambridge-vocab-elementary",
      title: "Cambridge Vocabulary Elementary in Use",
      description: "Elementary vocabulary building exercises",
      level: "elementary",
      category: "vocabulary",
      cover: "cambridge-elementary-vocab-in-use.jpg",
      files: [],
      isComingSoon: true,
    },
    {
      id: "cambridge-vocab-intermediate",
      title: "Cambridge Vocabulary Intermediate in Use",
      description:
        "Pre-intermediate and intermediate vocabulary building exercises",
      level: "intermediate",
      category: "vocabulary",
      cover: "cambridge-intermediate-vocab-in-use.jpg",
      files: [],
      isComingSoon: true,
    },
    {
      id: "cambridge-vocab-upper-intermediate",
      title: "Cambridge Vocabulary Upper Intermediate in Use",
      description: "Upper intermediate vocabulary building exercises",
      level: "upper-intermediate",
      category: "vocabulary",
      cover: "cambridge-upper-intermediate-vocab-in-use.webp",
      files: [],
      isComingSoon: true,
    },
    {
      id: "cambridge-vocab-advanced",
      title: "Cambridge Vocabulary Advanced in Use",
      description: "Advanced vocabulary building exercises",
      level: "advanced",
      category: "vocabulary",
      cover: "cambridge-advanced-vocab-in-use.jpg",
      files: [
        "U_001.A.mp3",
        "U_001.B.mp3",
        "U_001.C.mp3",
        "U_002.A.mp3",
        "U_002.B.mp3",
        "U_003.A.mp3",
        "U_003.B.mp3",
        "U_004.A.mp3",
        "U_004.B.mp3",
        "U_004.C.mp3",
        "U_005.A.mp3",
        "U_005.B.mp3",
        "U_006.A.mp3",
        "U_006.B.mp3",
        "U_007.A.mp3",
        "U_007.B.mp3",
        "U_007.C.mp3",
        "U_008.A.mp3",
        "U_008.B.mp3",
        "U_009.A.mp3",
        "U_009.B.mp3",
        "U_009.C.mp3",
        "U_009.D.mp3",
        "U_010.A.mp3",
        "U_010.B.mp3",
        "U_010.C.mp3",
        "U_011.A.mp3",
        "U_011.B.mp3",
        "U_011.C.mp3",
        "U_011.D.mp3",
        "U_012.A.mp3",
        "U_012.B.mp3",
        "U_012.C.mp3",
        "U_013.A.mp3",
        "U_013.B.mp3",
        "U_013.C.mp3",
        "U_014.A.mp3",
        "U_014.B.mp3",
        "U_014.C.mp3",
        "U_014.D.mp3",
        "U_015.A.mp3",
        "U_015.B.mp3",
        "U_015.C.mp3",
        "U_016.A.mp3",
        "U_016.B.mp3",
        "U_017.A.mp3",
        "U_017.B.mp3",
        "U_017.C.mp3",
        "U_017.D.mp3",
        "U_018.A.mp3",
        "U_018.B.mp3",
        "U_018.C.mp3",
        "U_019.A.mp3",
        "U_019.B.mp3",
        "U_019.C.mp3",
        "U_020.A.mp3",
        "U_020.B.mp3",
        "U_020.C.mp3",
      ],
    },

    // Grammar Books
    {
      id: "cambridge-grammar-elementary",
      title: "Cambridge Grammar Elementary in Use",
      description: "Essential grammar for elementary learners",
      level: "elementary",
      category: "grammar",
      cover: "cambridge-elementary-grammar-in-use.jpg",
      files: [],
      isComingSoon: true,
    },
    {
      id: "cambridge-grammar-intermediate",
      title: "Cambridge Grammar Intermediate in Use",
      description:
        "Grammar practice for pre-intermediate and intermediate students",
      level: "intermediate",
      category: "grammar",
      cover: "cambridge-intermediate-grammar-in-use.jpg",
      files: [],
      isComingSoon: true,
    },
    {
      id: "cambridge-grammar-advanced",
      title: "Cambridge Grammar Advanced in Use",
      description: "Advanced grammar structures and usage",
      level: "advanced",
      category: "grammar",
      cover: "cambridge-advanced-grammar-in-use.jpg",
      files: [],
      isComingSoon: true,
    },

    // Idioms Books
    {
      id: "cambridge-idioms-intermediate",
      title: "Cambridge Idioms Intermediate in Use",
      description: "Common idioms and expressions for intermediate learners",
      level: "intermediate",
      category: "idioms",
      cover: "cambridge-intermediate-idioms-in-use.jpg",
      files: [],
      isComingSoon: true,
    },
    {
      id: "cambridge-idioms-advanced",
      title: "Cambridge Idioms Advanced in Use",
      description: "Advanced idioms and idiomatic expressions",
      level: "advanced",
      category: "idioms",
      cover: "cambridge-advanced-idioms-in-use.jpg",
      files: [],
      isComingSoon: true,
    },

    // Collocations Books
    {
      id: "cambridge-collocations-intermediate",
      title: "Cambridge Collocations Intermediate in Use",
      description: "Word combinations for intermediate students",
      level: "intermediate",
      category: "collocations",
      cover: "cambridge-intermediate-collocations-in-use.jpg",
      files: [],
      isComingSoon: true,
    },
    {
      id: "cambridge-collocations-advanced",
      title: "Cambridge Collocations Advanced in Use",
      description: "Advanced word partnerships and collocations",
      level: "advanced",
      category: "collocations",
      cover: "cambridge-advanced-collocations-in-use.jpg",
      files: [],
      isComingSoon: true,
    },

    // Pronunciation Books
    {
      id: "cambridge-pronunciation-elementary",
      title: "Cambridge Pronunciation Elementary in Use",
      description: "Basic pronunciation skills and sounds",
      level: "elementary",
      category: "pronunciation",
      cover: "cambridge-elementary-pronunciation-in-use.jpg",
      files: [],
      isComingSoon: true,
    },
    {
      id: "cambridge-pronunciation-intermediate",
      title: "Cambridge Pronunciation Intermediate in Use",
      description:
        "Pre-intermediate and intermediate pronunciation and intonation",
      level: "intermediate",
      category: "pronunciation",
      cover: "cambridge-intermediate-pronunciation-in-use.jpg",
      files: [],
      isComingSoon: true,
    },

    // Listening Books
    {
      id: "cambridge-listening-elementary",
      title: "Cambridge Listening Elementary in Use",
      description: "Essential listening skills for beginners",
      level: "elementary",
      category: "listening",
      cover: "cambridge-elementary-listening-in-use.jpg",
      files: [],
      isComingSoon: true,
    },
    {
      id: "cambridge-listening-intermediate",
      title: "Cambridge Listening Intermediate in Use",
      description:
        "Pre-intermediate and intermediate listening comprehension practice",
      level: "intermediate",
      category: "listening",
      cover: "cambridge-intermediate-listening-in-use.jpg",
      files: [],
      isComingSoon: true,
    },
    {
      id: "cambridge-listening-advanced",
      title: "Cambridge Listening Advanced in Use",
      description: "Advanced listening skills and strategies",
      level: "advanced",
      category: "listening",
      cover: "cambridge-advanced-listening-in-use.jpg",
      files: [],
      isComingSoon: true,
    },

    // Speaking Books
    {
      id: "cambridge-speaking-intermediate",
      title: "Cambridge Speaking Intermediate in Use",
      description:
        "Speaking practice for pre-intermediate and intermediate learners",
      level: "intermediate",
      category: "speaking",
      cover: "cambridge-intermediate-speaking-in-use.jpg",
      files: [],
      isComingSoon: true,
    },
    {
      id: "cambridge-speaking-advanced",
      title: "Cambridge Speaking Advanced in Use",
      description: "Advanced speaking techniques and confidence",
      level: "advanced",
      category: "speaking",
      cover: "cambridge-advanced-speaking-in-use.jpg",
      files: [],
      isComingSoon: true,
    },
  ];

  const getCurrentBook = () =>
    audioBooks.find((book) => book.id === selectedBook);

  // Extract units from files
  const getAvailableUnits = () => {
    const files = getCurrentBook()?.files || [];
    const units = [...new Set(files.map((file) => file.split(".")[0]))];
    return units.sort();
  };

  const getCategoryColor = (category: AudioBook["category"]) => {
    switch (category) {
      case "vocabulary":
        return "#6B7280"; // neutral gray
      case "grammar":
        return "#6B7280";
      case "idioms":
        return "#6B7280";
      case "collocations":
        return "#6B7280";
      case "speaking":
        return "#6B7280";
      case "pronunciation":
        return "#6B7280";
      case "listening":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  // Extract lessons for selected unit
  const getAvailableLessons = () => {
    const files = getCurrentBook()?.files || [];
    const unitFiles = files.filter((file) =>
      file.startsWith(selectedUnit + ".")
    );
    return unitFiles.map((file) => file.split(".")[1]).sort();
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
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="max-w-4xl mx-auto py-8 px-6">
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
                <div className="mb-8">
                  <h1 className="text-2xl font-medium text-gray-800 mb-2">
                    Cambridge Books
                  </h1>
                  <p className="text-gray-600 text-sm">
                    Select a book to start your practice session
                  </p>
                </div>

                <div className="space-y-3">
                  {audioBooks
                    .sort((a, b) => b.files.length - a.files.length)
                    .map((book, index) => (
                      <motion.div
                        key={book.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        onClick={() =>
                          !book.isComingSoon && handleBookSelect(book.id)
                        }
                        className={cn(
                          "flex items-center justify-between gap-4 p-4 rounded-lg border transition-all",
                          book.isComingSoon
                            ? "bg-gray-100 border-gray-200 !opacity-60 cursor-not-allowed"
                            : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer"
                        )}
                        whileTap={!book.isComingSoon ? { scale: 0.98 } : {}}
                      >
                        <div className="flex-1">
                          <div className="flex items-center mb-2 gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: getCategoryColor(
                                  book.category
                                ),
                              }}
                            />
                            <span className="text-xs text-gray-500 capitalize">
                              {book.category}
                            </span>
                            {book.isComingSoon && (
                              <Badge variant="destructive" className="scale-75">
                                Coming Soon
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-medium text-gray-800 mb-1">
                            {book.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {book.description}
                          </p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-md border border-gray-200">
                          <div className="relative w-10 h-14">
                            <Image
                              src={`/covers/${book.cover}`}
                              alt={book.title}
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                        </div>
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
                  className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors text-sm"
                  whileHover={{ x: -2 }}
                >
                  <span className="mr-2">←</span>
                  Back to Books
                </motion.button>

                {/* Selected Book Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="mb-8 p-4 bg-white rounded-lg border border-gray-200"
                >
                  <h2 className="font-medium text-gray-800 mb-1">
                    {getCurrentBook()?.title}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {getCurrentBook()?.description}
                  </p>
                </motion.div>

                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Select a Unit
                  </h3>
                  <p className="text-sm text-gray-600">
                    Choose a unit to practice
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {getAvailableUnits().map((unit, index) => (
                    <motion.button
                      key={unit}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                      onClick={() => handleUnitSelect(unit)}
                      className="p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-sm font-medium text-gray-800">
                        {unit.replace("_", " ")}
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
                  className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors text-sm"
                  whileHover={{ x: -2 }}
                >
                  <span className="mr-2">←</span>
                  Back to Units
                </motion.button>

                {/* Selected Book & Unit Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="mb-8 p-4 bg-white rounded-lg border border-gray-200"
                >
                  <h2 className="font-medium text-gray-800 mb-1">
                    {getCurrentBook()?.title}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedUnit.replace("_", " ")} - Select an activity
                  </p>
                </motion.div>

                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Select an Activity
                  </h3>
                  <p className="text-sm text-gray-600">
                    Choose an activity to practice
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {getAvailableLessons().map((lesson, index) => (
                    <motion.button
                      key={lesson}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                      onClick={() => handleLessonSelect(lesson)}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        selectedLesson === lesson
                          ? "border-gray-400 bg-gray-50"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-sm font-medium text-gray-800">
                        {lesson}
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
                        className="px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
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
    </div>
  );
}
