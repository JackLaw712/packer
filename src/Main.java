import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.ArrayList;

class Main {
    private static final String OLD_VERSION_PATH = "old_version";
    private static final String NEW_VERSION_PATH = "new_version";

    public static void main(String[] args) {
        List<String> old_ver_list = new ArrayList<>();
        getAllFile(old_ver_list, OLD_VERSION_PATH);
        System.out.println(old_ver_list);
        System.out.println("Files in the old_ver_list = "  + old_ver_list.size());

        List<String> new_ver_list = new ArrayList<>();
        getAllFile(new_ver_list, NEW_VERSION_PATH);
        System.out.println(new_ver_list);
        System.out.println("Files in the new_ver_list = "  + new_ver_list.size());

    }

    /**
     * Compare two files
     * if same, output -1
     * if not, output lineNumber
     */
    public static long filesCompareByLine(Path path1, Path path2) throws IOException {
        // Same file, output -1
        // Not same file, output lineNumber
        try (BufferedReader bf1 = Files.newBufferedReader(path1);
                BufferedReader bf2 = Files.newBufferedReader(path2)) {
            long lineNumber = 1;
            String line1 = "", line2 = "";
            while ((line1 = bf1.readLine()) != null) {
                line2 = bf2.readLine();
                if (line2 == null || !line1.equals(line2)) {
                    return lineNumber;
                }
                lineNumber++;
            }
            if (bf2.readLine() == null) {
                return -1;
            } else {
                return lineNumber;
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
