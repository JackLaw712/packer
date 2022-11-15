import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.ArrayList;

class Main {
    private static final String OLD_VERSION_PATH = "please_put_old_version_here";
    private static final String NEW_VERSION_PATH = "please_put_new_version_here";

    public static void main(String[] args) {
        List<String> old_ver_list = new ArrayList<>();
        getAllFile(old_ver_list, OLD_VERSION_PATH);
        // System.out.println(old_ver_list);
        // System.out.println("Files in the old_ver_list = " + old_ver_list.size());

        List<String> new_ver_list = new ArrayList<>();
        getAllFile(new_ver_list, NEW_VERSION_PATH);
        // System.out.println(new_ver_list);
        // System.out.println("Files in the new_ver_list = " + new_ver_list.size());

        for (String n : new_ver_list) {
            // System.out.println(n);
            String o = n.replace("please_put_new_version_here", "please_put_old_version_here");
            // System.out.println(o);
            int compareResult;

            try {
                compareResult = filesCompareByLine(o, n);
            } catch (IOException e) {
                compareResult = 0;
                e.printStackTrace();
            }

            switch (compareResult) {
                case 1:
                    // code block
                    System.out.println(n + " file is same" + "\n");
                    break;
                case 2:
                    // code block
                    System.out.println(n + " files is not same" + "\n");
                    break;
                case 3:
                    // code block
                    System.out.println(n + " added new file" + "\n");
                    break;
                case 4:
                    // code block
                    System.out.println(o + " Deleted old file" + "\n");
                    break;
                default:
                    // code block
                    System.out.println("compareResult error");
            }
        }

    }

    /**
     * Compare two files
     * @param output = 1, same
     * @param output = 2, not same
     * @param output = 3, added
     * @param output = 4, deleted
     * @param lineNumber to store the different line, not used in this stage
     */
    public static int filesCompareByLine(String o, String n) throws IOException {
        Path path1 = Paths.get(o);
        Path path2 = Paths.get(n);
        if (path2.toFile().exists() && ! path1.toFile().exists()) {
            return 3;
        }
        if (path1.toFile().exists() && ! path2.toFile().exists()) {
            return 4;
        }
        try (BufferedReader bf1 = Files.newBufferedReader(path1);
                BufferedReader bf2 = Files.newBufferedReader(path2)) {
            // long lineNumber = 1;
            String line1 = "", line2 = "";
            while ((line1 = bf1.readLine()) != null) {
                line2 = bf2.readLine();
                if (line2 == null || !line1.equals(line2)) {
                    return 2;
                }
                // lineNumber++;
            }
            if (bf2.readLine() == null) {
                return 1;
            } else {
                return 2;
            }
        }
    }

    /**
     * find all the files in the directory
     * 
     * @param list to store the path of the files
     * @param path to store the path of the directory which is needed to be search
     */
    public static void getAllFile(List<String> list, String path) {
        File item = new File(path);
        boolean exists = item.exists();
        if (exists) {
            if (item.isFile()) {
                if (!item.getName().contains(".DS_Store")) {
                    list.add(item.getPath());
                    // System.out.println(item.getPath());
                }
            } else if (item.isDirectory()) {
                File[] items = item.listFiles();
                for (File f : items) {
                    getAllFile(list, f.getPath());
                    // System.out.println(f.getPath());
                }
            }
        } else {
            System.out.println("directory is not exists");
        }
    }

}
